//// To test on cloud 9:
//
// uncomment this line to include XRegExp
// var XRegExp = require('xregexp').XRegExp;

//// To connect emacs skewer to workflowy:
//
// 1. M-x js2-mode
//
// 2. M-x httpd-start
//
// 3. Run this bookmarklet on http://workflowy.com
//
//    javascript:(function(){var d=document;var s=d.createElement('script');s.src='http://localhost:8080/skewer';d.body.appendChild(s);})()
//
// 4. In chrome, click shield in address bar to allow running insecure
//    content on site.

var wfb = {}; // main workflowy-bump namespace

////////////////////////////////////////////////////////////////////////////////
//// settings

wfb.MAC_SHORTCUT = "ctrl+w";
wfb.OTHER_SHORTCUT = "ctrl+d";
wfb.runTestsOnStartup = false;
wfb.loggingEnabled = false;

////////////////////////////////////////////////////////////////////////////////
//// namespace for interfacing with workflowy

wfb.workflowy = {};

wfb.workflowy.bindShortcuts = function() {
    if (typeof $ === 'undefined') {
        console.log("Error binding shortcuts: jQuery not found");
        return;
    }
    $(".editor > textarea").unbind(".wfb"); // clear our existing shortcuts
    $(".editor > textarea").bind("keydown.wfb",
                                 wfb.workflowy._getShortcutKey(),
                                 wfb.workflowy._bumpTextArea);
    wfb.workflowy._indicateLoaded();
    console.log("Workflowy-bump loaded.");
};

wfb.workflowy._getShortcutKey = function() {
    if(navigator.appVersion.indexOf("Mac") != -1) return wfb.MAC_SHORTCUT;
    return wfb.OTHER_SHORTCUT;
};

wfb.workflowy._prettifyShortcutKey = function(text) {
    return text.replace("+", " + ");
};

wfb.workflowy._bumpTextArea = function() {
    var textarea = $(this).getProject().getName().children(".content");
    undoredo.startOperationBatch();
    textarea.setContent(wfb.bumpText(textarea.getContentText(),
                                     new Date(Date.now())));
    undoredo.finishOperationBatch();
    textarea.moveCursorToBeginning();
    return false;
};

wfb.workflowy._indicateLoaded = function() {
    $('#workflowy-bump-indicator').remove();
    var indicatorHtml = "<div id='workflowy-bump-indicator' class='saveButton' style='color:#aaa;'>"
            + wfb.workflowy._prettifyShortcutKey(wfb.workflowy._getShortcutKey())
            + "</div>";
    $('#savedViewHUDButton').after(indicatorHtml);
};

////////////////////////////////////////////////////////////////////////////////
//// date bumping logic

wfb.ERROR_MESSAGE = "ERROR";

wfb._datePattern =
    XRegExp("^ \
            ((?<year> \\d{1,2})[.] (?=\\d{1,2}[.]\\d{1,2}))? \
            ((?<month> \\d{1,2})[.])? \
            (?<day> \\d{1,2})? \
            (?<weekday> [mtwrfsu]\\b)? \
            \
            (?<addDef> \
            (\\+(?<addYear> \\d+)y)? \
            (\\+(?<addQuarter> \\d+)q)? \
            (\\+(?<addMonth> \\d+)m)? \
            (\\+(?<addWeek> \\d+)w)? \
            (\\+(?<addDay> \\d+)d?)? \
           )? \
            \
            (?<repeatDef>\\( \
            (\\+(?<repeatYear> \\d+)y)? \
            (\\+(?<repeatQuarter> \\d+)q)? \
            (\\+(?<repeatMonth> \\d+)m)? \
            (\\+(?<repeatWeek> \\d+)w)? \
            (\\+(?<repeatDay> \\d+)d?)? \
            (:(?<repeatWeekSpecial>-?\\d+))? \
            \\))? \
            ", 'x');

wfb.bumpText = function(text, today) {
    wfb.log("Bumping text \"" + text + "\" for date " + today);
    if(!today) {
        console.log("Error: missing parameter 'today'.");
        return wfb.ERROR_MESSAGE;
    }
    var m = XRegExp.exec(text, wfb._datePattern);
    if(!m || m[0] === "") {
        wfb.log("No regex match found.");
        return wfb._prettyFormatDate(today) + " " + text;
    }
    try {
        var date = wfb._bumpDate(m, today);
        var prettyDate = wfb._prettyFormatDate(date)
                + (m.repeatDef || "").replace('d', '');
        return text.replace(/^\S+/, prettyDate);
    } catch(e) {
        console.log(e);
        return wfb.ERROR_MESSAGE;
    }
};

wfb._bumpDate = function(m, today) {
    var date = wfb._getDate(m, today);
    wfb.log("The gotten date is " + date);
    date = wfb._addAdds(date, m);
    wfb.log("Date after adding adds is " + date);
    if(wfb._shouldCalcRepeats(m)) {
        if(m.repeatWeekSpecial && date.getDate() > 15) {
            date = wfb.date.reduceByOneWeek(date);
        }
        date = wfb._addRepeats(date, m);
        wfb.log("The date after adding repeats is " + date);
        return date;
    }
    wfb.log("The date had no repeats");
    return date;
};

wfb._shouldCalcRepeats = function(m) {
    return (m.year && m.month && m.day && !m.addDef && m.repeatDef)
        || (!m.year && !m.month && !m.day && !m.weekday
            && !m.addDef && m.repeatDef);
};

wfb._getDate = function(m, today) {

    wfb.log("Getting date where today is " + today);

    var date;

    if(m.year && m.month && m.day) {
        wfb.log("Year, month, and day found: "
                + m.year + ", " + m.month + ", " + m.day);
        date = new Date(parseInt(m.year, 10) + 2000,
                            parseInt(m.month, 10) - 1,
                            parseInt(m.day, 10));

        if(date.getMonth() != parseInt(m.month, 10) - 1) {
            wfb.log("It thinks parsed the user's date to  " + date);
            wfb.log("...based on " + m.year + ", " + m.month + ", " + m.day);
            wfb.log("date.getMonth() is " + date.getMonth()
                    + " != "
                    + "parseInt(m.month, 10) - 1 is " + (parseInt(m.month, 10) - 1));
            throw "Invalid original date.";
        }
        return date;
    }

    if(!m.year && !m.month && !m.day && !m.weekday) {
        wfb.log("No part of the date defined; returning today");
        return today;
    }

    if(!m.year && !m.month && !m.day && m.weekday) {
        wfb.log("Weekday only defined: " + m.weekday);
        date = wfb.date.addDays(today, 1);
        while(date.getDay() != wfb._uglyWeekday(m.weekday)) {
            date = wfb.date.addDays(date, 1);
        }
        return date;
    }

    if(!m.year && !m.month && m.day) {
        wfb.log("Day only defined: " + m.day);
        date = wfb.date.addDays(today, 1);
        while(date.getDate() != parseInt(m.day, 10)) {
            date = wfb.date.addDays(date, 1);
        }
        return date;
    }

    if(!m.year && m.month && m.day) {
        wfb.log("Month and day only defined: " + m.month + ", " + m.day);
        date = wfb.date.addDays(today, 1);
        while(!(date.getDate() == parseInt(m.day, 10)
                && date.getMonth() == (parseInt(m.month, 10) - 1))) {
            date = wfb.date.addDays(date, 1);
        }
        return date;
    }
};

wfb._addRepeats = function(date, m) {
    wfb.log("Adding repeats");
    if(m.repeatYear) date = wfb.date.addYears(date, parseInt(m.repeatYear, 10));
    if(m.repeatQuarter) date = wfb.date.addQuarters(date, parseInt(m.repeatQuarter, 10));
    if(m.repeatMonth) date = wfb.date.addMonths(date, parseInt(m.repeatMonth, 10));
    if(m.repeatWeek) date = wfb.date.addWeeks(date, parseInt(m.repeatWeek, 10));
    if(m.repeatDay) date = wfb.date.addDays(date, parseInt(m.repeatDay, 10));
    if(m.repeatWeekSpecial) {
        var weeks = wfb._listWeeks(date.getFullYear(), date.getMonth(), m.weekday);
        var weekIndex = parseInt(m.repeatWeekSpecial, 10);
        if(weekIndex < 0) {
            date = weeks[weeks.length + weekIndex];
        } else {
            date = weeks[weekIndex - 1];
        }
    }
    return date;
};

wfb._addAdds = function(date, m) {
    if(m.addYear) date = wfb.date.addYears(date, parseInt(m.addYear, 10));
    if(m.addQuarter) date = wfb.date.addQuarters(date, parseInt(m.addQuarter, 10));
    if(m.addMonth) date = wfb.date.addMonths(date, parseInt(m.addMonth, 10));
    if(m.addWeek) date = wfb.date.addWeeks(date, parseInt(m.addWeek, 10));
    if(m.addDay) date = wfb.date.addDays(date, parseInt(m.addDay, 10));
    return date;
};

wfb._listWeeks = function(year, month, weekday) {
    var first = new Date(year, month, 1);
    var weeks = [];
    for(var i = 1; i <= 31; ++i) {
        var date = wfb.date.addDays(first, i);
        if(date.getDay() == wfb._uglyWeekday(weekday)
           && date.getMonth() == month) {
            weeks.push(date);
        }
    }
    return weeks;
};

wfb._prettyFormatDate = function(date) {
    return wfb._pad2(date.getFullYear()) + "."
        + wfb._pad2(date.getMonth() + 1) + "."
        + wfb._pad2(date.getDate())
        + wfb._prettyWeekday(date.getDay());
};

wfb._prettyWeekday = function(n) {
    return {0:'u', 1:'m', 2:'t', 3:'w', 4:'r', 5:'f', 6:'s'}[n];
};

wfb._uglyWeekday = function(n) {
    return {'u':0, 'm':1, 't':2, 'w':3, 'r':4, 'f':5, 's':6}[n];
};

wfb._pad2 = function(numStr) {
    var s = "0" + numStr;
    return s[s.length-2] + s[s.length-1];
};

////////////////////////////////////////////////////////////////////////////////
//// date utils

wfb.date = {};

wfb.date.addYears = function(date, n) {
    return new Date(date.getFullYear() + n,
                    date.getMonth(),
                    date.getDate());
};

wfb.date.addQuarters = function(date, n) {
    return wfb.date.addWeeks(date, 13 * n);
};

wfb.date.addMonths = function(date, n) {
    var totalMonths = date.getMonth() + n;
    var newDate = new Date(date.getFullYear() + (totalMonths / 12),
                           totalMonths % 12,
                           date.getDate());
    if(date.getDate() != newDate.getDate()) {
        throw "Dates don't match after adding "
            + n + " months(s): " + date + " => " + newDate;
    }
    return newDate;
};

wfb.date.addWeeks = function(date, n) {
    return wfb.date.addDays(date, 7 * n);
};

wfb.date.addDays = function(date, n) {
    wfb.log("Adding n days to date: " + n + ", " + date);
    var copyDate = new Date(date);
    wfb.log("Copy of date is " + copyDate);
    var newDate = new Date(copyDate.setDate(copyDate.getDate() + n));
    wfb.log("New date is " + newDate);
    return newDate;
};

wfb.date.reduceByOneWeek = function(date) {
    var copyDate = new Date(date);
    return new Date(copyDate.setDate(copyDate.getDate() - 7));
};

////////////////////////////////////////////////////////////////////////////////
//// logging

wfb.log = function(msg) {
    if(wfb.loggingEnabled) {
        console.log("log: " + msg);
    }
};

////////////////////////////////////////////////////////////////////////////////
//// testing

wfb.test = {};
wfb.test.TestLog = function() {
    this.failCount = 0;
    this.passCount = 0;
    this.failMessages = [];
};

wfb.test.TestLog.prototype.equal = function(got, expected, group, initial) {
    if(got == expected) {
        this.passCount += 1;
        return this;
    } else {
        this.failCount += 1;
        this.failMessages.push(group
                               + ": " + initial + " => " + expected
                               + ", but got " + got + "");

        return this;
    }
};

wfb.test.TestLog.prototype.printSummaryReport = function() {
    console.log("Failed: " + this.failCount);
    console.log("Passed: " + this.passCount);
};

wfb.test.TestLog.prototype.printReport = function() {
    for(var msg in this.failMessages) {
        console.log(this.failMessages[msg]);
    }
    this.printSummaryReport();
};

wfb.test.testDate = new Date(2013, 3 - 1, 30);
wfb.test.testcases = [
    ["insert today", "random text", "13.03.30s random text"],
    ["no-op", "13.03.30s", "13.03.30s"],
    ["no-op", "13.03.30s ignore", "13.03.30s ignore"],
    ["repeat days", "13.03.30s(+1)", "13.03.31u(+1)"],
    ["repeat days", "13.03.31u(+1) ignore", "13.04.01m(+1) ignore"],
    ["repeat days", "13.04.01m(+2)", "13.04.03w(+2)"],
    ["repeat days", "13.04.01m(+2d)", "13.04.03w(+2)"],
    ["repeat days", "13.04.01m(+15)", "13.04.16t(+15)"],
    ["repeat days", "13.03.02s(+33)", "13.04.04r(+33)"],
    ["repeat days", "13.03.02s(+63)", "13.05.04s(+63)"],
    ["repeat days", "13.03.02s(+370)", "14.03.07f(+370)"],
    ["repeat weeks", "13.03.30s(+1w)", "13.04.06s(+1w)"],
    ["repeat weeks", "13.12.28s(+1w)", "14.01.04s(+1w)"],
    ["repeat weeks", "13.03.30s(+2w) ignore", "13.04.13s(+2w) ignore"],
    ["repeat weeks", "13.03.30s(+53w)", "14.04.05s(+53w)"],
    ["repeat quarters", "13.03.30s(+1q)", "13.06.29s(+1q)"],
    ["repeat months", "13.03.01f(+1m)", "13.04.01m(+1m)"],
    ["repeat months", "13.12.01u(+1m)", "14.01.01w(+1m)"],
    ["repeat months", "13.03.30s(+1m)", "13.04.30t(+1m)"],
    ["repeat months", "13.03.30s(+2m) ignore", "13.05.30r(+2m) ignore"],
    ["repeat months", "13.03.30s(+12m)", "14.03.30u(+12m)"],
    ["repeat months", "13.03.30s(+24m)", "15.03.30m(+24m)"],
    ["repeat months", "13.03.30s(+36m)", "16.03.30w(+36m)"],
    ["repeat months", "13.03.31u(+1m)", wfb.ERROR_MESSAGE],
    ["repeat years", "13.03.30s(+1y)", "14.03.30u(+1y)"],
    ["repeat years", "13.03.30s(+2y)", "15.03.30m(+2y)"],
    ["repeat years", "13.12.30s(+1y) ignore", "14.12.30t(+1y) ignore"],
    ["repeat only", "(+5)", "13.04.04r(+5)"],
    ["repeat only", "(+1w)", "13.04.06s(+1w)"],
    ["validations", "13.03.30", "13.03.30s"],
    ["validations", "13.03.30t", "13.03.30s"],
    ["validations", "13.15.30", wfb.ERROR_MESSAGE],
    ["validations", "13.03.42", wfb.ERROR_MESSAGE],
    ["validations",
     "13.03.30s(+1) 13.03.30s(+1) first only",
     "13.03.31u(+1) 13.03.30s(+1) first only"],
    ["weekday only", "t", "13.04.02t"],
    ["weekday only", "t ", "13.04.02t "],
    ["weekday only", "w ignore", "13.04.03w ignore"],
    ["weekday only", "t(+2)", "13.04.02t(+2)"],
    ["weekday only", "w(+2d) ignore", "13.04.03w(+2) ignore"],
    ["day only", "6", "13.04.06s"],
    ["day only", "30", "13.04.30t"],
    ["day only", "7(+2w) ignore", "13.04.07u(+2w) ignore"],
    ["no year", "03.30", "14.03.30u"],
    ["no year", "08.13", "13.08.13t"],
    ["no year", "03.31 ignore", "13.03.31u ignore"],
    ["no year", "03.30s", "14.03.30u"],
    ["no year", "03.31u", "13.03.31u"],
    ["adds day", "+4d", "13.04.03w"],
    ["adds day", "13.03.30+4d", "13.04.03w"],
    ["adds day", "+3 ignore", "13.04.02t ignore"],
    ["adds day", "+3(+1) ignore", "13.04.02t(+1) ignore"],
    ["adds week", "+2w", "13.04.13s"],
    ["adds week", "+3w(+1w) ignore", "13.04.20s(+1w) ignore"],
    ["adds week", "13.03.30+3w(+1w) ignore", "13.04.20s(+1w) ignore"],
    ["adds quarters", "13.03.30s+1q", "13.06.29s"],
    ["adds month", "+1m", "13.04.30t"],
    ["adds month", "+2m(+1w) ignore", "13.05.30r(+1w) ignore"],
    ["adds year", "+4y(+3y)", "17.03.30r(+3y)"],
    ["adds compound", "t+2w", "13.04.16t"],
    ["adds compound", "31u+2w", "13.04.14u"],
    ["adds compound", "t+2d(+2) ignore", "13.04.04r(+2) ignore"],
    ["adds compound", "t+2w(+2) ignore", "13.04.16t(+2) ignore"],
    ["adds compound", "t+2w+1(+2) ignore", "13.04.17w(+2) ignore"],
    ["adds compound", "5+2w(+2) ignore", "13.04.19f(+2) ignore"],
    ["adds compound", "5+2m(+2) ignore", "13.06.05w(+2) ignore"],
    ["nth x of month",
     "13.03.30s(+1m:-1) last saturday",
     "13.04.27s(+1m:-1) last saturday"],
    ["nth x of month",
     "13.08.31s(+1m:-1) last saturday bug fix",
     "13.09.28s(+1m:-1) last saturday bug fix"],
    ["nth x of month",
     "13.08.03s(+1m:-1) last saturday bug fix low",
     "13.09.28s(+1m:-1) last saturday bug fix low"],
    ["nth x of month",
     "13.03.30s(+1m:2) second saturday",
     "13.04.13s(+1m:2) second saturday"],
    ["nth x of month",
     "13.05.12u(+1y:2) 2nd sunday in may",
     "14.05.11u(+1y:2) 2nd sunday in may"]];

wfb.test.runTests = function() {
    console.log("****************************************");
    var tc = wfb.test.testcases;
    var log = new wfb.test.TestLog();
    for (var testcase in tc) {
        var group = tc[testcase][0];
        var before = tc[testcase][1];
        var expected = tc[testcase][2];
        try {
            log.equal(wfb.bumpText(before, wfb.test.testDate),
                      expected, group, before);
        } catch(e) {
            console.log("Failed on '" + group + "', '" + before + "'");
            throw e;
        }
    }
    log.printReport();
};


////////////////////////////////////////////////////////////////////////////////
//// load/initialize/main/run script

wfb.workflowy.bindShortcuts();
if(wfb.runTestsOnStartup) {
    wfb.test.runTests();
}