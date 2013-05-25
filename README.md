## Purpose

Make working with dates in [workflowy](http://workflowy.com) easy. Support for expanding date fragments and for repeating dates.

## Usage

Use keyboard shortcut to apply date magic to the current line.

## Installation

Available as either a bookmarklet or a chrome extension. In either case, the keyboard shortcut will appear in workflowy's toolbar to indicate that workflowy-bump is active.

### Bookmarklet

Create a [bookmarklet](http://en.wikipedia.org/wiki/Bookmarklet) ([installation hint](http://en.wikipedia.org/wiki/Bookmarklet#Installation)) that looks like this:

```javascript
javascript:(function(){var d=document;var s=d.createElement('script');s.src='https://raw.github.com/thanthese/workflowy-bump/master/workflowy-bump.js';d.body.appendChild(s);})()
```

Go to bookmarklet while on [workflowy](http://workflowy.com) to activate. 

### Chrome extension

Install this github repo as a chrome extension. Because I'm lazy and haven't packaged this up as a true chrome plugin, you'll have to [install it in developer mode](http://developer.chrome.com/extensions/getstarted.html#unpacked).

## Format

Dates take the form `yy.mm.ddw`. For example, April 12, 2013 would be written `13.04.12f`.

Weekdays Monday through Sunday are written: `m`, `t`, `w`, `r`, `f`, `s`, `u`.

A fully-specified input would look like this: `13.04.02t+1y+1q+1m+1w+1d(+1y+1q+1m+1w+1d)`, where

- `13.04.02t` is the date, here Tuesday, April 2nd, 2013.
- `+1y+1q+1m+1w+1d` is how much to add to the current date,  1 year, quarter, month, week, and day. This addition happens one time only.
- `(+1y+1q+1m+1w+1d)` defines how often this event repeats

## Examples

These examples assume that today's date is March 30th, 2013.

### Date completion from fragments

    t              => 13.04.02t
    6              => 13.04.06s
    03.30          => 14.03.30u

### Add to dates

    13.03.30+4d    => 13.04.03w
    +4d            => 13.04.03w
    +2w            => 13.04.13s
    +1m            => 13.04.30t

### Repeat dates

    13.04.01m(+2d) => 13.04.03w(+2)
    13.04.01m(+15) => 13.04.16t(+15)
    13.03.30s(+1w) => 13.04.06s(+1w)
    13.03.01f(+1m) => 13.04.01m(+1m)
    13.03.30s(+2y) => 15.03.30m(+2y)
    (+5)           => 13.04.04r(+5)

### Combinations

    31u+2w         => 13.04.14u
    t+2d(+2)       => 13.04.04r(+2)
    t+2w+1(+2)     => 13.04.17w(+2)
    5+2w(+2)       => 13.04.19f(+2)

### nth weekday of x month

    13.03.30s(+1m:-1) last saturday    => 13.04.27s(+1m:-1) last saturday
    13.03.30s(+1m:2) second saturday   => 13.04.13s(+1m:2) second saturday
    13.05.12u(+1y:2) 2nd sunday in may => 14.05.11u(+1y:2) 2nd sunday in may

### Some subtleties

A **week** is 7 days.

A **month** is the same numeric date, the following month. (For example, the 1st of
every month.)

A **quarter** is 13 weeks. (So if you started on a Saturday you'll end on a Saturday.)

A **year** is only touches the year. (So you'll go from December 25th to December 25th.)

## Browser compatibility

Safari is weird. In older versions it hangs, and in newer versions it breaks on some dates. I'm not especially worried about fixing it because both chrome and firefox are better browser options.

If you manage to find a solution for Safari, please send me a pull request.

## FAQs

### Why not use a calendar app?

Because I use workflowy for everything else, why not as a calendar as well? I use a [tickler](http://en.wikipedia.org/wiki/Tickler_file) system.

### Why a Year, Month, Day format?

So I can sort numerically.

### How do I run the test suite?

Paste this into the console:

```javascript
wfb.test.runTests();
```
