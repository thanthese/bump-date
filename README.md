## Purpose

Command line tool for completing and repeating dates in a compact, human-readable format. Basically a big ball of "Do what I mean" for dates.

## Usage

Operates on STDIN and STDOUT. To output the nearest Wednesday:

    > echo "w" | node bump-date.js
    15.01.14.w

Intended use is to pipe a line from a text editor through the utility
and back into the active buffer, as with Emacs' `shell-command-on-region` or Vim's `!!`.

To run tests:

    node bump-date.js --test

### Plus one

Pass the `--plusone` option to add one day to the passed-in date. The date is completed and pluses are added as usual, but repeats are ignored.

## Requirements

- [node](http://nodejs.org/)
- [xregexp](http://xregexp.com/) node package

There aren't any installation instructions. It's just a single `.js` file -- download it and run it with node.

## Tutorial

The date format is `yy.mm.ddw`, with weekdays Monday through Sunday written as: `m`, `t`, `w`, `r`, `f`, `s`, `u`. "Friday, April 12, 2013" would be written `13.04.12f`. This format allows dates to be sorted numerically (`sort -n`).

If you give only part of the date the rest will be filled in. (These examples assume that today is March 30th, 2013.)

    t                 => 13.04.02t
    6                 => 13.04.06s
    06                => 13.04.06s
    03.30             => 14.03.30u
    14.03.30          => 14.03.30u
    14.03.30u         => 14.03.30u

Junk at the end of the line is ignored,

    14.03.30u foo     => 14.03.30u foo

which lets you store a list of calendar items in a file, like this:

    15.01.12m get groceries
    15.01.13t make a million dollars
    15.01.14w build a Scrooge McDuck pool

You can set a date relative to today with the `+n` syntax, where `n` is a **d**ay, **w**eek, **m**onth, **q**uarter, or **y**ear. If no unit is specified, day is assumed.

    +4                => 13.04.03w
    +4d               => 13.04.03w
    +2w               => 13.04.13s
    +1m               => 13.04.30t

Or set a date relative to a specific date.

    13.03.30s+4d      => 13.04.03w

The `->` syntax is similar to `+`, but it sticks around. This makes it easy to set up and manage recurring events.

    13.04.01m->2d     => 13.04.03w->2d
    13.04.01m->15     => 13.04.16t->15
    13.03.30s->1w     => 13.04.06s->1w
    13.03.01f->1m     => 13.04.01m->1m
    13.03.30s->2y     => 15.03.30m->2y
    ->5d              => 13.04.04r->5d

The `:+` operator works almost the same way, but adds from *today* rather than the listed date. Use `->` for events that always happen on the same day (Monday night bowling), and `:+` for reminders you need *x* days after completing a task (even if you're 2 days late the house still doesn't need vacuuming again for another 4 days).

    13.03.15f:+4d     => 13.04.03w:+4d

You can mix and match completion, adding, and a type of repetition.

    31u+2w            => 13.04.14u
    t+2d->2d          => 13.04.04r->2d
    t+2w+1->2d        => 13.04.17w->2d
    5+2w->2d          => 13.04.19f->2d
    5+2w:+2d          => 13.04.19f:+1d

The last operator, `|+`, is for those "2nd Sunday of the month" situations, like Mother's Day.

2nd Saturday of every month:

    13.03.30s|+1m+2s  => 13.04.13s|+1m+2s

Last Saturday of every month:

    13.03.30s|+1m-1s => 13.04.27s|+1m-1s

2nd sunday in may:

    13.05.11s|+1y+2s  => 14.05.10s|+1y+2s

Some subtleties:

- A **week** is 7 days.

- A **month** is the same numeric date the following month, like the 1st of every month.

- A **quarter** is 13 weeks. If you start on a Saturday you'll end on a Saturday.

- A **year** only touches the year, like December 25th to December 25th.

## License

MIT
