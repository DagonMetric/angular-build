﻿angular-build
=====================

<!-- Badges section here. -->
[![Build status](https://img.shields.io/appveyor/ci/mmzliveid/angular-build.svg?label=appveyor)](https://ci.appveyor.com/project/mmzliveid/angular-build)
[![Build Status](https://img.shields.io/travis/BizAppFramework/angular-build/master.svg?label=travis)](https://travis-ci.org/BizAppFramework/angular-build)
[![npm version](https://badge.fury.io/js/%40bizappframework%2Fangular-build.svg)](https://badge.fury.io/js/%40bizappframework%2Fangular-build)
[![Dependency Status](https://david-dm.org/bizappframework/angular-build.svg)](https://david-dm.org/bizappframework/angular-build)
[![npm](https://img.shields.io/npm/dm/@bizappframework/angular-build.svg)](https://www.npmjs.com/package/@bizappframework/angular-build)

## What is this?

Build system for Angular app and library projects. This can be used as alternative to [angular-cli](https://github.com/angular/angular-cli).

*Customizations over [angular-cli](https://github.com/angular/angular-cli):*

- Build support for both library projects (internally with [rollup](https://github.com/rollup/rollup)) and app projects (internally with [webpack](https://github.com/webpack/webpack))
- DLL bundling support for optimizing build time in development, see [DllPlugin](https://github.com/webpack/docs/wiki/list-of-plugins#dllplugin), [DllReferencePlugin](https://github.com/webpack/docs/wiki/list-of-plugins#dllreferenceplugin)
- Multi-platform favicons generation (online/offline)- integration with [realfavicongenerator](http://realfavicongenerator.net) and [evilebottnawi/favicons](https://github.com/evilebottnawi/favicons)
- Customizable html injection - can inject scripts, styles, favicons, etc into separate partial views
- Can work well with [Microsoft ASP.NET Core Spa Services](https://github.com/aspnet/JavaScriptServices)
- Can work with webpack cli directly

## Prerequisites

Make sure you have [Node](https://nodejs.org/en/download/) version >= 6.9 and npm >= 3. 

## Table of Contents

* [Installation](#installation)
* [More about ngb](#more-about-ngb)
* [License](#license)

## Installation

**BEFORE YOU INSTALL:** please read the [prerequisites](#prerequisites)
```bash
npm install -g @bizappframework/angular-build
```

## More about ngb

```bash
ngb --help
```

### License

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat)](/LICENSE) 
