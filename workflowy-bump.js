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

//// todos
// - prevent keyboard shortcut from propogating

var wfb = {}; // main workflowy-bump namespace

////////////////////////////////////////////////////////////////////////////////
//// namespace for interfacing with workflowy

wfb.workflowy = {};

wfb.workflowy.BUMP_SHORTCUT = "ctrl+w";

wfb.workflowy.bindShortcuts = function() {
    $(".editor > textarea").unbind(".wfb"); // don't attach multiple times
    $(".editor > textarea").bind("keydown.wfb",
                                 wfb.workflowy.BUMP_SHORTCUT,
                                 wfb.workflowy.bumpTextArea);
};

wfb.workflowy._bumpTextArea = function() {
    undoredo.startOperationBatch();
    var textarea = $(this).getProject().getName().children(".content");
    textarea.setContent(wfb.bumpText(textarea.getContentText(),
                                     new Date(Date.now())));
    textarea.moveCursorToBeginning();
    undoredo.finishOperationBatch();
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
    var m = XRegExp.exec(text, wfb._datePattern);
    if(wfb._noMatch(m)) {
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

    if((m.year && m.month && m.day && !m.addDay && m.repeatDef)
       || (!m.year && !m.month && !m.day && !m.addDay && !m.weekday 
           && m.repeatDef)) {
        return wfb._addRepeats(date, m);
    }

    return date;
};

wfb._getDate = function(m, today) {

    if(!m.year && !m.month && !m.day && !m.weekday) {
        return new Date(today); // return a COPY of today
    }

    var date = new Date(parseInt(m.year) + 2000,
                        parseInt(m.month) - 1,
                        parseInt(m.day));

    if(m.month && date.getMonth() != parseInt(m.month) - 1) {
        throw "Invalid original date.";
    }

    if(!m.year && !m.month && !m.day && m.weekday) {
        var d = wfb.date.addDays(today, 1);
        while(d.getDay() != wfb._uglyWeekday(m.weekday)) {
            console.log(d.getDay() + ", " + wfb._uglyWeekday(m.weekday));
            d = wfb.date.addDays(d, 1);
        }
        return d;
    }

    return date;
};

wfb._addRepeats = function(date, m) {
    if(m.repeatYear) date = wfb.date.addYears(date, parseInt(m.repeatYear));
    if(m.repeatQuarter) date = wfb.date.addQuarters(date, parseInt(m.repeatQuarter));
    if(m.repeatMonth) date = wfb.date.addMonths(date, parseInt(m.repeatMonth));
    if(m.repeatWeek) date = wfb.date.addWeeks(date, parseInt(m.repeatWeek));
    if(m.repeatDay) date = wfb.date.addDays(date, parseInt(m.repeatDay));
    return date;
};

wfb._noMatch = function(m) {
    return !m || m[0] == "";
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
    if(date.getDate() != newDate.getDate())
    {
        throw "Dates don't match after adding "
            + n + " months(s): " + date + " => " + newDate;
    }
    return newDate;
};

wfb.date.addWeeks = function(date, n) {
    return wfb.date.addDays(date, 7 * n);
};

wfb.date.addDays = function(date, n) {
    var copyDate = new Date(date);
    return new Date(copyDate.setDate(copyDate.getDate() + n));
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
    skewer.log("Failed: " + this.failCount);
    skewer.log("Passed: " + this.passCount);
};

wfb.test.TestLog.prototype.printReport = function() {
    for(var msg in this.failMessages) {
        skewer.log(this.failMessages[msg]);
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
    ["weekday only", "w(+2d) ignore", "13.04.03w(+2) ignore"]
    // ["day only", "6", "13.04.06s"],
    // ["day only", "30", "13.04.30t"],
    // ["day only", "7(+2w) ignore", "13.04.07u(+2w) ignore"],
    // ["no year", "03.30", "14.03.30u"],
    // ["no year", "03.31 ignore", "13.03.31u ignore"],
    // ["no year", "03.30s", "14.03.30u"],
    // ["no year", "03.31u", "13.03.31u"],
    // ["adds day", "+4d", "13.04.03w"],
    // ["adds day", "13.03.30+4d", "13.04.03w"],
    // ["adds day", "+3 ignore", "13.04.02t ignore"],
    // ["adds day", "+3(+1) ignore", "13.04.02t(+1) ignore"],
    // ["adds week", "+2w", "13.04.13s"],
    // ["adds week", "+3w(+1w) ignore", "13.04.20s(+1w) ignore"],
    // ["adds week", "13.03.30+3w(+1w) ignore", "13.04.20s(+1w) ignore"],
    // ["adds quarters", "13.03.30s+1q", "13.06.29s"],
    // ["adds month", "+1m", "13.04.30t"],
    // ["adds month", "+2m(+1w) ignore", "13.05.30r(+1w) ignore"],
    // ["adds year", "+4y(+3y)", "17.03.30r(+3y)"],
    // ["adds compound", "t+2w", "13.04.16t"],
    // ["adds compound", "31u+2w", "13.04.14u"],
    // ["adds compound", "t+2d(+2) ignore", "13.04.04r(+2) ignore"],
    // ["adds compound", "t+2w(+2) ignore", "13.04.16t(+2) ignore"],
    // ["adds compound", "t+2w+1(+2) ignore", "13.04.17w(+2) ignore"],
    // ["adds compound", "5+2w(+2) ignore", "13.04.19f(+2) ignore"],
    // ["adds compound", "5+2m(+2) ignore", "13.06.05w(+2) ignore"],
    // ["nth x of month",
    //  "13.03.30s(+1m:-1) last saturday",
    //  "13.04.27s(+1m:-1) last saturday"],
    // ["nth x of month",
    //  "13.03.30s(+1m:2) second saturday",
    //  "13.04.13s(+1m:2) second saturday"],
    // ["nth x of month",
    //  "13.05.12u(+1y:2) 2nd sunday in may",
    //  "14.05.11u(+1y:2) 2nd sunday in may"]
];

wfb.test.runTests = function() {
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
            skewer.log("Failed on '" + group + "', '" + before + "'");
            throw e;
        }
    }
    log.printReport();
};


////////////////////////////////////////////////////////////////////////////////
//// load/initialize script

wfb.workflowy.bindShortcuts();
skewer.log("****************************************");
wfb.test.runTests();
