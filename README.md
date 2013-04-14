## Purpose

Make working with dates in workflowy easy. Support for expanding date fragments and for repeating dates.

## Usage

It's a basic shell script: takes from `stdin`, writes to `stdout`. With no input it runs the tests and prints a report. On my system I have it hooked up to OS X's Automator using a node that transforms selected text, and bound to a shortcut.

## Format

Dates take the form `yy.mm.ddw`. For example, April 12, 2013 would be written `13.04.12f`.

Weekdays Monday through Sunday are written: `m`, `t`, `w`, `r`, `f`, `s`, `u`.

## Examples

These examples assume that today's date is March 30th, 2013.

### Complete dates

    t     => 13.04.02t
    6     => 13.04.06s
    03.30 => 14.03.30u

### Add to dates

    13.03.30+4d => 13.04.03w
    +4d         => 13.04.03w
    +2w         => 13.04.13s
    +1m         => 13.04.30t

### Repeat dates

    13.04.01m(+2d) => 13.04.03w(+2)
    13.04.01m(+15) => 13.04.16t(+15)
    13.03.30s(+1w) => 13.04.06s(+1w)
    13.03.01f(+1m) => 13.04.01m(+1m)
    13.03.30s(+2y) => 15.03.30m(+2y)
    (+5)           => 13.04.04r(+5)

### Combinations

    31u+2w     => 13.04.14u
    t+2d(+2)   => 13.04.04r(+2)
    t+2w+1(+2) => 13.04.17w(+2)
    5+2w(+2)   => 13.04.19f(+2)

### nth weekday of x month

    13.03.30s(+1m:-1) last saturday    => 13.04.27s(+1m:-1) last saturday
    13.03.30s(+1m:2) second saturday   => 13.04.13s(+1m:2) second saturday
    13.05.12u(+1y:2) 2nd sunday in may => 14.05.11u(+1y:2) 2nd sunday in may

## Some subtleties

A *week* is 7 days.
A *month* is the same numeric date, the following month. (For example, the 1st of every month.)
A *quarter* is 13 weeks. (So if you started on a Saturday you'll end on a Saturday.)
A *year* is only touches the year. (So you'll go from December 25th to December 25th.)

## FAQs

### Why not use a calendar app?

Because I use workflowy for everything else, why not as a calendar as well? I use a [ticker](http://en.wikipedia.org/wiki/Tickler_file) system.

### But why not a bookmarklet?

A bookmarklet would be better: it would run faster, be more portable, and be easier to setup. Unfortunately I couldn't write the results back to workflowy. The clipboard is off-limits because of javascript security issues, and I couldn't figure out how to make workflowy accept changes made directly to the DOM.

For those interested in trying to make it work, this javascript snippet will grab the text on the current line.

```javascript
$('.lastEdited')[0].innerHTML
```

Let me know if you have more luck than I did.

### Why python?

Because it's widely available, often installed by default, starts up fast, and has great regular expression support.


### But why python 2.6?

Because it's what came with my machine.

### Why a Year, Month, Day format?

So I can sort numerically.
