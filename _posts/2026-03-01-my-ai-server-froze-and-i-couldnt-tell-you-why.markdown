---
title: "My AI Server Froze and I Couldn't Tell You Why -- Here's What I Fixed"
layout: post
date: 2026-03-01 12:00
tag:
- linux
- monitoring
- sysstat
- ai-inference
- ubuntu
category: blog
author: davidlow
description: "How a real system freeze on my local AI inference server led me to set up 1-minute sysstat monitoring -- and why every local LLM setup needs it."
headerImage: false
hidden: false
---

Recently, my home AI inference server -- a GMKTEC EVO X2 AI Mini PC powered by an AMD Ryzen AI MAX+ 395 with 128 GB of unified LPDDR5X memory -- silently froze after 49 hours of uptime. No warning. No crash dump. No kernel panic. The system journal, which faithfully records every event on a Linux machine, just... stopped. One moment it was logging a routine data collection. Twenty minutes later, I was standing at the machine holding the power button.

SSH was dead. The network was unreachable. My first instinct was to blame a network outage or maybe overheating. But when I sat down to investigate after the hard reboot, neither turned out to be true. Temperature had been a cool 37°C. Memory was only 15% utilized. There was no out-of-memory event, no thermal throttle, nothing obvious.

What ultimately cracked the case was `sysstat` -- a system monitoring tool that had been quietly running in the background, recording CPU and memory snapshots every 10 minutes. Those snapshots were the **only** forensic data that survived the freeze. They let me rule out overheating and memory exhaustion, and narrow the root cause down to a kernel workqueue deadlock that had been progressively worsening over two days.

The diagnosis was a success. But it also exposed a gap: 10-minute intervals are coarse. The memory readings jumped straight from "everything's fine" to "LINUX RESTART." If I'd had 1-minute resolution, I might have caught the degradation pattern in real time -- or at least had a much sharper picture of the minutes leading up to the hang.

So I fixed that. Here's how, and why you should too.

---

## Why This Matters If You Run Local AI

More of us are running large language models on our own hardware. Whether you're serving a model through Ollama, running inference with llama.cpp, or hosting a vLLM endpoint for your team, the appeal is clear: no API costs, full control, your data stays local.

But unlike a managed cloud GPU instance, nobody is monitoring your local server for you. There's no CloudWatch dashboard, no PagerDuty alert, no auto-scaling safety net. When something goes wrong at 11 PM on a Tuesday, the first sign is usually "I can't reach the machine anymore."

AI inference workloads are also **bursty** in a way that traditional server loads aren't. A large model loading into memory can consume 60 GB of RAM in seconds. A batch of concurrent requests can pin every CPU core while the model generates tokens. These spikes happen fast, and they resolve fast. A monitoring system that samples every 10 minutes will miss most of them entirely.

My GMKTEC EVO X2 runs an AMD Ryzen AI MAX+ 395 with 128 GB of unified LPDDR5X memory and an integrated Radeon 8060S GPU with 40 compute units. Thanks to AMD's Variable Graphics Memory, the GPU can dynamically claim up to 96 GB of that shared memory pool as VRAM -- enough to load a 70B-parameter model entirely on-device. It's not a datacenter machine -- it sits on my desk. But it runs real workloads, and when it goes down, I need to know why. That's the whole point of monitoring: not pretty graphs, but **answers after something goes wrong**.

---

## What is sysstat?

Think of `sysstat` as your Linux machine's flight recorder. Just like the black box on an aircraft continuously records flight data so investigators can reconstruct what happened after an incident, `sysstat` continuously records system performance data -- CPU usage, memory utilization, disk I/O, network throughput, and more -- so you can look back and see exactly what was happening at any point in time.

The good news: if you're running Ubuntu (or most Debian-based distributions), `sysstat` is likely already installed. You can check with:

{% highlight bash %}
dpkg -l | grep sysstat
{% endhighlight %}

Under the hood, `sysstat` is a collection of tools that work together:

- **`sadc`** (System Activity Data Collector) -- the engine. It reads performance counters from the kernel and writes them to a binary data file. You never run this directly.
- **`sa1`** -- a wrapper that tells `sadc` to take a snapshot. This is what runs on a schedule.
- **`sa2`** -- generates daily summary reports from the collected data.
- **`sar`** (System Activity Reporter) -- your main interface. This is the command you use to query historical data: "show me CPU usage from last Thursday between 7 PM and midnight."

The data lives in `/var/log/sysstat/`, with one binary file per day named `saDD` (where DD is the day of the month -- `sa25` for the 25th, for example). By default, files are retained for 7 days and then cleaned up automatically.

Out of the box on Ubuntu, `sysstat` collects a snapshot every **10 minutes** and records a **basic set of metrics** -- CPU, memory, swap, and disk I/O. That's a reasonable default for a general-purpose server, but it's not enough for our use case. We want:

1. **1-minute intervals** -- fine enough to catch the bursty spikes that AI workloads produce.
2. **All available metrics** -- adding network interfaces, interrupts, power management, hugepages, and more on top of the basics.

Both of these are simple configuration changes. No new software to install.

---

## The Setup: Three Changes, Five Minutes

There are three things to change, and I'll explain why each one matters.

### Step 1: Override the collection timer to 1 minute

On modern Ubuntu, `sysstat` is triggered by a systemd timer called `sysstat-collect.timer`. By default, it fires every 10 minutes. We want every 1 minute.

The right way to change a systemd timer's schedule is with a **drop-in override** -- a small config file that supplements the original without modifying it. This is important because the original file lives in `/usr/lib/systemd/system/` and belongs to the `sysstat` package. If you edit it directly, a future package update will overwrite your changes. Drop-in overrides live in `/etc/systemd/system/` and are always preserved.

{% highlight bash %}
sudo mkdir -p /etc/systemd/system/sysstat-collect.timer.d

cat <<'EOF' | sudo tee /etc/systemd/system/sysstat-collect.timer.d/override.conf
[Timer]
OnCalendar=
OnCalendar=*:*:00
EOF
{% endhighlight %}

The first `OnCalendar=` (with no value) clears the default 10-minute schedule. The second line, `OnCalendar=*:*:00`, means "every hour, every minute, at second :00" -- i.e., once per minute.

### Step 2: Switch from disk-only to full statistics

The default configuration in `/etc/sysstat/sysstat` sets `SADC_OPTIONS="-S DISK"`, which adds block device statistics to the basic collection but still misses network interfaces, interrupts, power management, and other extended metrics. We want everything.

{% highlight bash %}
sudo sed -i 's/^SADC_OPTIONS="-S DISK"/SADC_OPTIONS="-S XALL"/' /etc/sysstat/sysstat
{% endhighlight %}

The `-S XALL` flag enables collection of all available statistics: CPU utilization, memory usage, swap, network interfaces, NFS, sockets, hugepages, power management, and more. The storage overhead is minimal -- roughly 5-6 MB per day, or about 40 MB for a full week of 1-minute data.

### Step 3: Disable the legacy cron job

Here's a subtlety that's easy to miss. On Ubuntu 24.04, `sysstat` ships with **both** a systemd timer and a cron job, and both are active by default. The cron job runs at 5-minute offsets (`:05`, `:15`, `:25`, ...) while the timer runs on the tens (`:00`, `:10`, `:20`, ...). Together they produce a sample every 5 minutes -- but they're not aware of each other, and with our 1-minute timer, the cron becomes redundant noise.

{% highlight bash %}
sudo sed -i 's|^5-55/10|#5-55/10|' /etc/cron.d/sysstat
{% endhighlight %}

This comments out the cron schedule line, leaving the systemd timer as the sole driver.

### Apply the changes

{% highlight bash %}
sudo systemctl daemon-reload
sudo systemctl restart sysstat-collect.timer
{% endhighlight %}

### Verify

{% highlight bash %}
systemctl status sysstat-collect.timer
{% endhighlight %}

You should see the drop-in override listed and a `Trigger` timestamp roughly 1 minute in the future. After a couple of minutes, confirm data is flowing:

{% highlight bash %}
sar -u | tail -5
{% endhighlight %}

The timestamps should be 1 minute apart:

{% highlight text %}
08:55:02 PM     all      0.20      0.00      0.19      0.19      0.00     99.43
08:56:11 PM     all      0.21      0.00      0.19      0.19      0.00     99.42
08:57:11 PM     all      0.20      0.00      0.18      0.20      0.00     99.42
08:58:02 PM     all      0.19      0.00      0.19      0.19      0.00     99.42
08:59:01 PM     all      0.19      0.00      0.19      0.19      0.00     99.43
{% endhighlight %}

That's it. Five minutes of work, and your machine now records a comprehensive performance snapshot every minute, automatically, surviving reboots, with 7-day retention and zero ongoing maintenance.

---

## Reading the Data: sar in Practice

Having the data is only useful if you can query it. Here's a quick tour of the commands you'll actually use.

### CPU Utilization

{% highlight bash %}
sar -u
{% endhighlight %}

This shows today's CPU data. The columns that matter most:

| Column | What it means |
|---|---|
| `%user` | Time spent on user-space processes (your applications, your model inference) |
| `%system` | Time spent on kernel operations (memory management, I/O) |
| `%iowait` | Time the CPU was idle while the system had an outstanding disk I/O request |
| `%idle` | Time the CPU had nothing to do |

For AI inference, watch `%user` (this is where your model runs) and `%iowait` (high values here mean your storage is a bottleneck, possibly during model loading).

### Memory Utilization

{% highlight bash %}
sar -r
{% endhighlight %}

Key columns:

| Column | What it means |
|---|---|
| `kbmemfree` | Truly free memory (not used for anything) |
| `kbmemused` | Memory in active use |
| `%memused` | Percentage of total memory in use |
| `kbbuffers` / `kbcached` | Memory used by the kernel for disk caching (reclaimable under pressure) |

When a large model loads, you'll see `%memused` jump sharply. If it climbs toward 90%+ and stays there, you're flirting with swap usage or OOM conditions.

### Network

{% highlight bash %}
sar -n DEV
{% endhighlight %}

Useful if you're serving inference over the network and want to see traffic patterns -- or if you need to confirm the network was actually active before an incident, as I did during my freeze investigation.

### Querying Historical Data

This is where `sar` really shines for post-incident analysis. You're not limited to today's data.

{% highlight bash %}
# Show CPU usage from a specific date (the 25th of the current month)
sar -u -f /var/log/sysstat/sa25

# Show memory usage in a specific time window
sar -r -s 19:00:00 -e 23:30:00

# Combine both: memory on Feb 25, 7 PM to 11:30 PM
sar -r -f /var/log/sysstat/sa25 -s 19:00:00 -e 23:30:00
{% endhighlight %}

During my freeze investigation, this exact capability is what ruled out an out-of-memory condition. The `sar -r` output from that evening showed memory usage steady at 14-15%, right up until the journal stopped. No spike, no leak, no OOM. That single query eliminated an entire class of hypotheses and redirected the investigation toward the kernel.

With 1-minute resolution, these queries become even more valuable. Instead of seeing six data points in the final hour before an incident, you get sixty.

---

## What's Next

There's one blind spot this setup doesn't cover: **GPU and VRAM**.

If you're running model inference on a GPU -- whether discrete or an integrated one like the Radeon 8060S on my GMKTEC EVO X2 -- you'll want to track GPU utilization and VRAM pressure. The Ryzen AI MAX+ 395 can allocate up to 96 GB of unified memory as VRAM, so knowing how much is actually in use matters. sysstat doesn't collect GPU metrics, but on AMD systems, the kernel exposes them through sysfs files that are trivial to read and log.

A natural next step would be a lightweight script on a systemd timer that reads these sysfs values every minute and appends them to a CSV -- the same philosophy as the sysstat setup: no new dependencies, minimal overhead, data that survives reboots. If your needs eventually grow beyond historical forensics into real-time dashboards and alerting, Prometheus + Grafana is the well-trodden path. But for a single local inference server, the approach in this article is hard to beat for simplicity-to-value ratio.

---

## The Bottom Line

Running a local AI inference server is one of the most rewarding things you can do as a practitioner. But "local" means "your responsibility." When something goes wrong -- and it will -- the quality of your monitoring determines whether you spend twenty minutes diagnosing the problem or twenty hours guessing.

`sysstat` is already on your machine. The setup takes five minutes. The storage cost is negligible. And the next time your server hangs at 11 PM, those 1-minute snapshots might be the only evidence that survives.

The best time to set up monitoring is before you need it. The second best time is now.
