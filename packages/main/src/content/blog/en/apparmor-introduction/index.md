---
title: 'AppArmor, a powerful security tool'
description: 'Learn how to activate and configure AppArmor on GNU/Linux'
pubDate: 2026-09-08T20:59:15.901Z
lang: en
categories: ['security']
tags: ['apparmor', 'security', 'linux']
cover: './cover.webp'
coverAlt: ''
translationKey: 'apparmor-introduccion'
draft: false
math: false
author: 'Jose Maldonado "Yukiteru Amano"'
---

In the world of computer security, protecting our operating systems is a constant priority. GNU/Linux, known for its robustness, is not exempt from threats. Fortunately, we have powerful tools to help us fortify our distributions. One of them, often underestimated but incredibly effective, is **AppArmor**.

## What is AppArmor and why should you care?

AppArmor (Application Armor) is a Linux kernel security module that focuses on mandatory access control (MAC). Unlike traditional discretionary access control (DAC) systems (such as user and group permissions), AppArmor allows you to define security policies at the application level.

![AppArmor, a powerful MAC into the Linux kernel](./apparmor-logo.jpg)

In simpler terms, AppArmor lets you tell each specific program what it can and cannot do on your system. This includes:

- **Which files it can access:** If a web browser only needs to read and write files in your home directory, AppArmor can ensure it can't access important system files or another user's home directory.
- **Which network capabilities it can access:** It can restrict access to unauthorized databases or network services.
- **Which system calls it can make:** It controls how a program interacts with the kernel.

### Why does it offer better security?

The main benefit of AppArmor is its ability to limit the potential damage of a compromised application. For example, if an attacker manages to exploit a vulnerability in a program (such as a web server or email client), AppArmor can prevent the malicious program from spreading, accessing sensitive data, or causing further damage to the system. It's an essential second line of defense.

The advantage of AppArmor over other application-level control systems such as SELinux (which is also very powerful, but much more complex to administer) is that AppArmor relies on strict pathname parameters or pathname patterns, which generally makes it easier to understand and configure for most administrators and users.

## Installing AppArmor on Debian and Ubuntu

On most modern Debian and Ubuntu distributions, AppArmor is already installed and enabled by default. However, it is good practice to check its status and ensure that all components are present, especially since the default configuration on these systems is permissive (complain mode or unconfined).

To confirm if AppArmor is installed and active, you can run:

```bash
sudo aa-status
```

If AppArmor is active, you'll see output similar to this, indicating which application profiles are currently in **Enforcing** or **Complain** mode:

```bash
apparmor module is loaded.
1 profile is loaded.
3 processes are unconfined.
/usr/sbin/cups-browsed (1234)
/usr/sbin/cups-browsed (1235)
/usr/sbin/cups-browsed (1236)
```

If aa-status tells you that the module is not loaded, or you want to install it manually, you can do so with:

```bash
# Update the package list
sudo apt update

# Install the AppArmor core and administrative packages
sudo apt install apparmor apparmor-utils

# Installing profiles
sudo apt install apparmor-profiles apparmor-profiles-extra
```

Once installed, you should reboot your system to ensure the kernel module loads correctly.

## How does AppArmor work? Security profiles

AppArmor operates by creating and applying security profiles. A profile is a text file that precisely defines the access rules for a specific application. These profiles are typically located in the `/etc/apparmor.d/` directory.

Each profile contains directives that specify:

- `owner`: The user who owns the profile.
- `deny`: Actions that are explicitly prohibited.
- `allow`: Allowed actions.
- `read, write, execute, link, mmap`: Specific permissions on files or directories.
- `glob`: File or directory name patterns.

Modes:

- **Enforcing**: The profile rules are strictly enforced. Any attempt to violate a rule will be blocked and logged.
- **Complain**: The profile rules are validated, but violations are not blocked. Only violations are logged. This is useful for debugging profiles.
- **Disabled**: The profile is completely inactive for the application.

When an application configured with AppArmor starts, the kernel checks to see if a profile exists associated with that specific executable. If so, AppArmor begins monitoring the application's actions and applying the rules defined in the profile.

## Configuring and Improving Security with Profiles

While AppArmor is much easier to administer than SELinux, the reality is that for anyone with little knowledge, generating and configuring profiles is a daunting task, one that would go beyond this simple article.

But all is not lost, as the community always responds. For years, a project called apparmor.d has existed, created by [**Alexandre Pujol**](https://pujol.io/), which includes more than 1,500 AppArmor profiles ready to use. In fact, I personally collaborate with this project, generating profiles and fine-tuning them so they can be used in **Enforcing** mode without interfering with the normal operation of your computer.

The result is surprising. Most daemons (e.g., rpcbind, Docker, and libvirtd) are protected by AppArmor in my case. And the best part is that installing all this on Debian or Ubuntu isn't complicated; just do this:

```bash

# Installing the dependencies
sudo apt install apparmor-profiles build-essential \
    config-package-dev debhelper golang-go rsync git

# Cloning the repository
git clone https://github.com/roddhjav/apparmor.d.git

# Building the .deb package to install
cd apparmor.d
dpkg-buildpackage -b -d --no-sign

# Installing the package
sudo dpkg -i ../apparmor.d_*.deb
```

With these steps, you have over 1,500 AppArmor profiles ready to use. If necessary, you'll only need to do a little fine-tuning to avoid problems. And in the latter case, Pujol has a [website](https://apparmor.pujol.io/) where everything is very well explained.

**Does this work for other systems?** Of course, as long as your distro generates a kernel with AppArmor, you won't have any problems, so you can use it on compatible Fedora/Red Hat (if you don't like SELinux), SUSE (where it's already enabled by default), ArchLinux and derivatives, among others.
