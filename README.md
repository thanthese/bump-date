## Purpose

Make working with dates in workflowy easy.

## Usage

It's a basic shell script: takes from stdin, writes to stdout. With no input it runs the tests and prints a report. I have it hooked up to OS X's Automator, using a node that transforms selected text, and bound to a shortcut.

## Examples

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
