//  + simple add
// -> from date shown
// :+ from today

var XRegExp = require('xregexp').XRegExp;

var bd = {}; // main bump-date namespace

////////////////////////////////////////////////////////////////////////////////
//// settings

bd.loggingEnabled = false;

////////////////////////////////////////////////////////////////////////////////
//// date bumping logic

bd.ERROR_MESSAGE = "ERROR";

bd._datePattern =
    XRegExp(
        "^" +

        "((?<year>\\d{1,2})[.] (?= \\d{1,2} [.] \\d{1,2} ))?" +
        "((?<month>\\d{1,2})[.])?" +
        "(?<day>\\d{1,2})?" +
        "(?<weekday>[mtwrfsu]\\b)?" +

        "(?<addDef> " +
        "  \\+ (" +
        "    (?<addYear>\\d+)y" +
        "    |" +
        "    (?<addQuarter>\\d+)q" +
        "    |" +
        "    (?<addMonth>\\d+)m" +
        "    |" +
        "    (?<addWeek>\\d+)w" +
        "    |" +
        "    (?<addDay>\\d+)d" +
        "  )" +
        ")?" +

        "(?<repeatDef>" +
        "  (" +
        "    ( (?<fromGiven>->) | (?<fromToday>:\\+) )" +
        "    (" +
        "      ((?<repeatYear>\\d+)y)" +
        "      |" +
        "      ((?<repeatQuarter>\\d+)q)" +
        "      |" +
        "      ((?<repeatMonth>\\d+)m)" +
        "      |" +
        "      ((?<repeatWeek>\\d+)w)" +
        "      |" +
        "      ((?<repeatDay>\\d+)d)" +
        "    )" +
        "  )" +
        "  |" +
        "  (\\|\\+ " +
        "    (?<rDelta>\\d+)  " +
        "    (?<rType>[my])  " +
        "    (?<rNthWeek>[-\\+]\\d+)  " +
        "    (?<rDay>[mtwrfsu])  " +
        "  )" +
        ")?" +
        "", 'x');

bd.bumpText = function(text, today) {
    bd.log("Bumping text \"" + text + "\" for date " + today);
    if (!today) {
        console.log("Error: missing parameter 'today'.");
        return bd.ERROR_MESSAGE;
    }
    var m = XRegExp.exec(text, bd._datePattern);
    if (!m || m[0] === "") {
        bd.log("No regex match found.");
        return bd._prettyFormatDate(today) + " " + text;
    }
    try {
        var date = bd._bumpDate(m, today);
        var prettyDate = bd._prettyFormatDate(date) + (m.repeatDef || "");
        return text.replace(/^\S+/, prettyDate);
    } catch (e) {
        //  console.log(e);
        return bd.ERROR_MESSAGE;
    }
};

bd._bumpDate = function(m, today) {
    var date = bd._getDate(m, today);
    bd.log("The gotten date is " + date);
    date = bd._addAdds(date, m);
    bd.log("Date after adding adds is " + date);
    if (bd._shouldCalcRepeats(m)) {
        if (m.rNthWeek && date.getDate() > 15) {
            date = bd.date.reduceByOneWeek(date);
        }
        date = bd._addRepeats(date, m);
        bd.log("The date after adding repeats is " + date);
        return date;
    }
    bd.log("The date had no repeats");
    return date;
};

bd._shouldCalcRepeats = function(m) {
    var a = m.year && m.month && m.day && !m.addDef && m.repeatDef;
    var b = !m.year && !m.month && !m.day && !m.weekday && !m.addDef && m.repeatDef;
    return a || b;
};

bd._getDate = function(m, today) {

    bd.log("Getting date where today is " + today);

    if (m.fromToday) {
        return today;
    }

    var date;

    if (m.year && m.month && m.day) {
        bd.log("Year, month, and day found: " + m.year + ", " + m.month + ", " + m.day);
        date = new Date(parseInt(m.year, 10) + 2000,
            parseInt(m.month, 10) - 1,
            parseInt(m.day, 10));

        if (date.getMonth() != parseInt(m.month, 10) - 1) {
            bd.log("It thinks parsed the user's date to  " + date);
            bd.log("...based on " + m.year + ", " + m.month + ", " + m.day);
            bd.log("date.getMonth() is " + date.getMonth() + " != " + "parseInt(m.month, 10) - 1 is " + (parseInt(m.month, 10) - 1));
            throw "Invalid original date.";
        }
        return date;
    }

    if (!m.year && !m.month && !m.day && !m.weekday) {
        bd.log("No part of the date defined; returning today");
        return today;
    }

    if (!m.year && !m.month && !m.day && m.weekday) {
        bd.log("Weekday only defined: " + m.weekday);
        date = bd.date.addDays(today, 1);
        while (date.getDay() != bd._uglyWeekday(m.weekday)) {
            date = bd.date.addDays(date, 1);
        }
        return date;
    }

    if (!m.year && !m.month && m.day) {
        bd.log("Day only defined: " + m.day);
        date = bd.date.addDays(today, 1);
        while (date.getDate() != parseInt(m.day, 10)) {
            date = bd.date.addDays(date, 1);
        }
        return date;
    }

    if (!m.year && m.month && m.day) {
        bd.log("Month and day only defined: " + m.month + ", " + m.day);
        date = bd.date.addDays(today, 1);
        while (!(date.getDate() == parseInt(m.day, 10) && date.getMonth() == (parseInt(m.month, 10) - 1))) {
            date = bd.date.addDays(date, 1);
        }
        return date;
    }
};

bd._addRepeats = function(date, m) {
    bd.log("Adding repeats");
    if (m.repeatYear) date = bd.date.addYears(date, parseInt(m.repeatYear, 10));
    if (m.repeatQuarter) date = bd.date.addQuarters(date, parseInt(m.repeatQuarter, 10));
    if (m.repeatMonth) date = bd.date.addMonths(date, parseInt(m.repeatMonth, 10));
    if (m.repeatWeek) date = bd.date.addWeeks(date, parseInt(m.repeatWeek, 10));
    if (m.repeatDay) date = bd.date.addDays(date, parseInt(m.repeatDay, 10));
    if (m.rNthWeek) {
        if (m.rType === "m") {
            date = bd.date.addMonths(date, parseInt(m.rDelta, 10));
        } else {
            date = bd.date.addYears(date, parseInt(m.rDelta, 10));
        }
        var weeks = bd._listWeeks(date.getFullYear(), date.getMonth(), m.rDay);
        var weekIndex = parseInt(m.rNthWeek, 10);
        if (weekIndex < 0) {
            date = weeks[weeks.length + weekIndex];
        } else {
            date = weeks[weekIndex - 1];
        }
    }
    return date;
};

bd._addAdds = function(date, m) {
    if (m.addYear) date = bd.date.addYears(date, parseInt(m.addYear, 10));
    if (m.addQuarter) date = bd.date.addQuarters(date, parseInt(m.addQuarter, 10));
    if (m.addMonth) date = bd.date.addMonths(date, parseInt(m.addMonth, 10));
    if (m.addWeek) date = bd.date.addWeeks(date, parseInt(m.addWeek, 10));
    if (m.addDay) date = bd.date.addDays(date, parseInt(m.addDay, 10));
    return date;
};

bd._listWeeks = function(year, month, weekday) {
    var first = new Date(year, month, 1);
    var weeks = [];
    for (var i = 0; i <= 31; ++i) {
        var date = bd.date.addDays(first, i);
        if (date.getDay() == bd._uglyWeekday(weekday) && date.getMonth() == month) {
            weeks.push(date);
        }
    }
    return weeks;
};

bd._prettyFormatDate = function(date) {
    return bd._pad2(date.getFullYear()) + "." + bd._pad2(date.getMonth() + 1) + "." + bd._pad2(date.getDate()) + bd._prettyWeekday(date.getDay());
};

bd._prettyWeekday = function(n) {
    return {
        0: 'u',
        1: 'm',
        2: 't',
        3: 'w',
        4: 'r',
        5: 'f',
        6: 's'
    }[n];
};

bd._uglyWeekday = function(n) {
    return {
        'u': 0,
        'm': 1,
        't': 2,
        'w': 3,
        'r': 4,
        'f': 5,
        's': 6
    }[n];
};

bd._pad2 = function(numStr) {
    var s = "0" + numStr;
    return s[s.length - 2] + s[s.length - 1];
};

////////////////////////////////////////////////////////////////////////////////
//// date utils

bd.date = {};

bd.date.addYears = function(date, n) {
    return new Date(date.getFullYear() + n,
        date.getMonth(),
        date.getDate());
};

bd.date.addQuarters = function(date, n) {
    return bd.date.addWeeks(date, 13 * n);
};

bd.date.addMonths = function(date, n) {
    var totalMonths = date.getMonth() + n;
    var newDate = new Date(date.getFullYear() + (totalMonths / 12),
        totalMonths % 12,
        date.getDate());
    if (date.getDate() != newDate.getDate()) {
        throw "Dates don't match after adding " + n + " months(s): " + date + " => " + newDate;
    }
    return newDate;
};

bd.date.addWeeks = function(date, n) {
    return bd.date.addDays(date, 7 * n);
};

bd.date.addDays = function(date, n) {
    bd.log("Adding n days to date: " + n + ", " + date);
    var copyDate = new Date(date);
    bd.log("Copy of date is " + copyDate);
    var newDate = new Date(copyDate.setDate(copyDate.getDate() + n));
    bd.log("New date is " + newDate);
    return newDate;
};

bd.date.reduceByOneWeek = function(date) {
    var copyDate = new Date(date);
    return new Date(copyDate.setDate(copyDate.getDate() - 7));
};

////////////////////////////////////////////////////////////////////////////////
//// logging

bd.log = function(msg) {
    if (bd.loggingEnabled) {
        console.log("log: " + msg);
    }
};

////////////////////////////////////////////////////////////////////////////////
//// testing

bd.test = {};
bd.test.TestLog = function() {
    this.failCount = 0;
    this.passCount = 0;
    this.failMessages = [];
};

bd.test.TestLog.prototype.equal = function(got, expected, group, initial) {
    if (got == expected) {
        this.passCount += 1;
        return this;
    } else {
        this.failCount += 1;
        this.failMessages.push(group + ": " + initial + " => " + expected + ", but got " + got + "");

        return this;
    }
};

bd.test.TestLog.prototype.printSummaryReport = function() {
    console.log("Failed: " + this.failCount);
    console.log("Passed: " + this.passCount);
};

bd.test.TestLog.prototype.printReport = function() {
    for (var msg in this.failMessages) {
        console.log(this.failMessages[msg]);
    }
    this.printSummaryReport();
};

bd.test.testDate = new Date(2013, 3 - 1, 30);  // saturday
bd.test.testcases = [
    ["insert today", "random text", "13.03.30s random text"],

    ["no-op", "13.03.30s", "13.03.30s"],
    ["no-op", "13.03.30s ignore", "13.03.30s ignore"],

    ["repeat days", "13.03.30s->1d", "13.03.31u->1d"],
    ["repeat days", "13.04.01m->2d", "13.04.03w->2d"],
    ["repeat days", "13.04.01m->15d", "13.04.16t->15d"],
    ["repeat days", "13.03.02s->33d", "13.04.04r->33d"],
    ["repeat days", "13.03.02s->63d", "13.05.04s->63d"],
    ["repeat days", "13.03.02s->370d", "14.03.07f->370d"],

    ["repeat weeks", "13.03.30s->1w", "13.04.06s->1w"],
    ["repeat weeks", "13.12.28s->1w", "14.01.04s->1w"],
    ["repeat weeks", "13.03.30s->2w ignore", "13.04.13s->2w ignore"],
    ["repeat weeks", "13.03.30s->53w", "14.04.05s->53w"],

    ["repeat quarters", "13.03.30s->1q", "13.06.29s->1q"],

    ["repeat months", "13.03.01f->1m", "13.04.01m->1m"],
    ["repeat months", "13.12.01u->1m", "14.01.01w->1m"],
    ["repeat months", "13.03.30s->1m", "13.04.30t->1m"],
    ["repeat months", "13.03.30s->2m ignore", "13.05.30r->2m ignore"],
    ["repeat months", "13.03.30s->12m", "14.03.30u->12m"],
    ["repeat months", "13.03.30s->24m", "15.03.30m->24m"],
    ["repeat months", "13.03.30s->36m", "16.03.30w->36m"],
    ["repeat months", "13.03.31u->1m", bd.ERROR_MESSAGE],

    ["repeat years", "13.03.30s->1y", "14.03.30u->1y"],
    ["repeat years", "13.03.30s->2y", "15.03.30m->2y"],
    ["repeat years", "13.12.30s->1y ignore", "14.12.30t->1y ignore"],

    ["repeat only", "->5d", "13.04.04r->5d"],
    ["repeat only", "->1w", "13.04.06s->1w"],
    ["repeat only", ":+5d", "13.04.04r:+5d"],
    ["repeat only", ":+1w", "13.04.06s:+1w"],

    ["repeat days from 'today'", "11.03.02s:+1d", "13.03.31u:+1d"],
    ["repeat days from 'today'", "13.03.02s:+371d", "14.04.05s:+371d"],
    ["repeat weeks from 'today'", "10.03.30s:+53w", "14.04.05s:+53w"],
    ["repeat quarters from 'today'", "10.03.30s:+1q", "13.06.29s:+1q"],
    ["repeat months from 'today'", "10.03.01f:+1m", "13.04.30t:+1m"],
    ["repeat years from 'today'", "10.03.30s:+1y", "14.03.30u:+1y"],

    ["validations", "13.03.30", "13.03.30s"],
    ["validations", "13.03.30t", "13.03.30s"],
    ["validations", "13.15.30", bd.ERROR_MESSAGE],
    ["validations", "13.03.42", bd.ERROR_MESSAGE],
    ["validations", "13.03.30s->1d 13.03.30s->1d first only", "13.03.31u->1d 13.03.30s->1d first only"],

    ["weekday only", "t", "13.04.02t"],
    ["weekday only", "t ", "13.04.02t "],
    ["weekday only", "w ignore", "13.04.03w ignore"],
    ["weekday only", "t->2d", "13.04.02t->2d"],
    ["weekday only", "w->2d ignore", "13.04.03w->2d ignore"],
    ["weekday only", "w:+2d ignore", "13.03.30s:+2d ignore"],

    ["day only", "6", "13.04.06s"],
    ["day only", "30", "13.04.30t"],
    ["day only", "7->2w ignore", "13.04.07u->2w ignore"],
    ["day only", "7:+2w ignore", "13.03.30s:+2w ignore"],

    ["no year", "03.30", "14.03.30u"],
    ["no year", "08.13", "13.08.13t"],
    ["no year", "03.31 ignore", "13.03.31u ignore"],
    ["no year", "03.30s", "14.03.30u"],
    ["no year", "03.31u", "13.03.31u"],

    ["adds day", "+4d", "13.04.03w"],
    ["adds day", "13.03.30+4d", "13.04.03w"],
    ["adds day", "+3d ignore", "13.04.02t ignore"],
    ["adds day", "+3d->1d ignore", "13.04.02t->1d ignore"],
    ["adds day", "+3d:+1d ignore", "13.04.02t:+1d ignore"],

    ["adds week", "+2w", "13.04.13s"],
    ["adds week", "+3w->1w ignore", "13.04.20s->1w ignore"],
    ["adds week", "13.03.30+3w->1w ignore", "13.04.20s->1w ignore"],
    ["adds week", "13.03.30+3w:+1w ignore", "13.04.20s:+1w ignore"],

    ["adds quarters", "13.03.30s+1q", "13.06.29s"],

    ["adds month", "+1m", "13.04.30t"],
    ["adds month", "+2m->1w ignore", "13.05.30r->1w ignore"],

    ["adds year", "+4y->3y", "17.03.30r->3y"],

    ["adds compound", "t+2w", "13.04.16t"],
    ["adds compound", "31u+2w", "13.04.14u"],
    ["adds compound", "t+2d->2d ignore", "13.04.04r->2d ignore"],
    ["adds compound", "t+2w->2d ignore", "13.04.16t->2d ignore"],
    ["adds compound", "5+2w->2d ignore", "13.04.19f->2d ignore"],
    ["adds compound", "5+2m->2d ignore", "13.06.05w->2d ignore"],

    ["nth x of month", "13.03.30s|+1m-1s last sat", "13.04.27s|+1m-1s last sat"],
    ["nth x of month", "13.08.31s|+1m-1s last sat bug fix", "13.09.28s|+1m-1s last sat bug fix"],
    ["nth x of month", "13.08.03s|+1m-1s last sat bug fix low", "13.09.28s|+1m-1s last sat bug fix low"],
    ["nth x of month", "13.03.30s|+1m+2s 2nd sat", "13.04.13s|+1m+2s 2nd sat"],
    ["nth x of month", "13.05.12u|+1y+2u 2nd sunday in may", "14.05.11u|+1y+2u 2nd sunday in may"],
    ["nth x of month", "15.01.11u|+1m+1u 1st of a month", "15.02.01u|+1m+1u 1st of a month"],
    ["nth x of month", "15.01.06f|+1y+1f 1st of a year", "16.01.01f|+1y+1f 1st of a year"],
];

bd.test.runTests = function() {
    console.log("");
    console.log("****************************************");
    var tc = bd.test.testcases;
    var log = new bd.test.TestLog();
    for (var testcase in tc) {
        var group = tc[testcase][0];
        var before = tc[testcase][1];
        var expected = tc[testcase][2];
        try {
            log.equal(bd.bumpText(before, bd.test.testDate),
                expected, group, before);
        } catch (e) {
            console.log("Failed on '" + group + "', '" + before + "'");
            throw e;
        }
    }
    log.printReport();
};

////////////////////////////////////////////////////////////////////////////////
//// run from command line

// do the normal date-bumping thing, but from stdin and to stdout
function main() {
    process.stdin.resume();
    process.stdin.on('data', bump);

    function bump(data) {
        var text = data.toString();
        var now = new Date(Date.now());
        process.stdout.write(bd.bumpText(text, now));
    }
}

////////////////////////////////////////////////////////////////////////////////
//// load/initialize/main/run script

if (process.argv[2] === "--test") {
    bd.test.runTests();
} else {
    main();
}
