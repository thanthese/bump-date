# python 2.6

import sys
import re
import datetime

################################################################################
## globals

ERROR_MESSAGE = "ERROR"

################################################################################
## user IO

USER_INPUT = " ".join(sys.stdin).strip()

def getUserInput():
  return USER_INPUT

def sendUserOutput(text):
  print text

################################################################################
## testing "framework"

class TestLog():
  def __init__(self):
    self.failCount = 0
    self.passCount = 0
    self.failMessages = []
  def equal(self, got, expected, msg):
    if(got==expected):
      self.passCount += 1
      return self
    else:
      self.failCount += 1
      self.failMessages.append("  %s: Expected \"%s\" but got \"%s\"." %
                               (msg, str(expected), str(got)))
      return self
  def printReport(self):
    for msg in self.failMessages:
      print msg
    self.printSummaryReport()
  def printSummaryReport(self):
    print "Failed: %d" % self.failCount
    print "Passed: %d" % self.passCount

################################################################################
## bump - main date bumping logic

pattern = re.compile(r"""
  ((?P<year>    \d\d?)[.](?=\d\d?[.]\d\d?))?
  ((?P<month>   \d\d?)[.])?
   (?P<day>     \d\d?)?
  ((?P<weekday> [mtwrfsu])\b)?

  (\+(?P<addYear>    \d\d?)y)?
  (\+(?P<addMonth>   \d\d?)m)?
  (\+(?P<addWeek>    \d\d?)w)?
  (\+(?P<addQuarter> \d\d?)q)?
  (\+(?P<addDay>     \d\d?)d?\b)?

  (?P<repeatDef>\(\+
    ((?P<repeatYear>    \d+)y
    |(?P<repeatMonth>   \d+)m
    |(?P<repeatWeek>    \d+)w
    |(?P<repeatQuarter> \d+)q
    |(?P<repeatDay>     \d+)d?
    )
    (:(?P<repeatWeekSpecial> -?\d+))?
  \))?
  """, re.VERBOSE)

# aliases (poor man's DSL)
g = lambda m, name: m.group(name)
i = lambda m, name: int(m.group(name))

def bump(text, today=datetime.date.today()):
  """Bump date segment in text. Main entry point."""
  m = pattern.match(text)
  if(hasNoMatch(m)):
    return text
  try:
    date = bumpDate(m, today)
  except ValueError:
    date = ERROR_MESSAGE
  return re.sub(r"^\S*", date, text)

def bumpDate(m, date):
  """Bump date as described in a matcher."""
  date = fixYear(date)
  date = completeDate(m, date)
  date = addGeneric('add', m, date)
  if (hasOnlyRepeats(m)
      or (hasYMD(m)
          and hasNoAdder(m)
          and hasAnyRepeats(m))):
    date = repeatDate(m, date)
  return prettyDate(date, g(m,'repeatDef'))

def completeDate(m, today):
  """Convert a date fragment into a fully-specified date."""
  oneday = datetime.timedelta(days=1)
  if hasNoYMDW(m):
    return today
  if hasYMD(m):
    return datetime.date(i(m,'year'), i(m,'month'), i(m,'day'))

  if hasW(m):
    date = today + oneday
    while date.weekday() != uglyWeekday(g(m,'weekday')):
      date += oneday
    return date

  if hasD(m):
    date = today + oneday
    while date.day != i(m,'day'):
      date += oneday
    return date

  if hasMD(m):
    date = today + oneday
    while date.day != i(m,'day') or date.month != i(m,'month'):
      date += oneday
    return date

def repeatDate(m, date):
  """Repeat the date, if the matcher calls for it."""
  originalWeekday = date.weekday()
  date = addGeneric('repeat', m, date)
  if g(m,'repeatWeekSpecial'):
    weeks = listWeeks(date.year, date.month, originalWeekday)
    date = weeks[i(m,'repeatWeekSpecial')]
  return date

def addGeneric(prefix, m, date):
  """Perform all standard additions to date.

  In this package there are some standard ways to add to a date. They
  follow a naming convention with the same set of suffixes. This
  function takes the prefix and adds to the date following that
  convention."""
  if g(m,prefix+'Year'):
    date = date.replace(year=date.year + i(m,prefix+'Year'))
  if g(m,prefix+'Month'):
    date = addMonths(date, i(m,prefix+'Month'))
  if g(m,prefix+'Week'):
    date += datetime.timedelta(weeks=i(m,prefix+'Week'))
  if g(m,prefix+'Quarter'):
    date += datetime.timedelta(weeks=13*i(m,prefix+'Quarter'))
  if g(m,prefix+'Day'):
    date += datetime.timedelta(days=i(m,prefix+'Day'))
  return date

def listWeeks(year, month, weekday):
  """List, for example, all Sundays in March 2013. First entry is None
  for off-by-one error purposes."""
  first = datetime.date(year=year, month=month, day=1)
  weeks = [None]
  for i in range(31):
    date = first + datetime.timedelta(days=i)
    if (date.weekday() == weekday and date.month == month):
      weeks.append(date)
  return weeks

def fixYear(date):
  """Standardize representing 2013 as 13."""
  return date if date.year < 2000 else date.replace(year=date.year-2000)

def addMonths(date, month):
  """Add some months to date, and wrap year if necessary."""
  totalMonths = date.month + month
  return date.replace(month=totalMonths % 12,
                      year=date.year + int(totalMonths / 12))

################################################################################
## bump - tests on matcher

def hasNoMatch(m):
  return not m or not any(list(m.groups()))

def hasNoYMDW(m):
  return (not m.group('day')
          and not m.group('month')
          and not m.group('year')
          and not m.group('weekday'))

def hasD(m):
  return (m.group('day')
          and not m.group('month')
          and not m.group('year'))

def hasW(m):
  return (not m.group('day')
          and not m.group('month')
          and not m.group('year')
          and g(m,'weekday'))

def hasMD(m):
  return (m.group('day')
          and m.group('month')
          and not m.group('year'))

def hasYMD(m):
  return (m.group('day')
          and m.group('month')
          and m.group('year'))

def hasNoAdder(m):
  return (not m.group('addYear')
          and not m.group('addMonth')
          and not m.group('addWeek')
          and not m.group('addQuarter')
          and not m.group('addDay'))

def hasAnyRepeats(m):
  return (m.group('repeatYear')
          or m.group('repeatMonth')
          or m.group('repeatWeek')
          or m.group('repeatQuarter')
          or m.group('repeatDay'))

def hasOnlyRepeats(m):
  return (hasNoYMDW(m)
          and hasNoAdder(m)
          and hasAnyRepeats(m))

################################################################################
## bump - formatting

def prettyDate(date, repeatDef=''):
  return ('%02d.%02d.%02d%s'
          % (date.year, date.month, date.day,
             prettyWeekday(date.weekday()))
          + (repeatDef or '').replace('d', ''))

def prettyWeekday(n):
  return {0:'m', 1:'t', 2:'w', 3:'r', 4:'f', 5:'s', 6:'u'}[n]

def uglyWeekday(n):
  return {'m':0, 't':1, 'w':2, 'r':3, 'f':4, 's':5, 'u':6}[n]

################################################################################
## tests/specification

testDate = datetime.date(2013, 3, 30)
testCases = [
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
  ["repeat months", "13.03.31u(+1m)", ERROR_MESSAGE],
  ["repeat years", "13.03.30s(+1y)", "14.03.30u(+1y)"],
  ["repeat years", "13.03.30s(+2y)", "15.03.30m(+2y)"],
  ["repeat years", "13.12.30s(+1y) ignore", "14.12.30t(+1y) ignore"],
  ["repeat only", "(+5)", "13.04.04r(+5)"],
  ["repeat only", "(+1w)", "13.04.06s(+1w)"],
  ["validations", "13.03.30", "13.03.30s"],
  ["validations", "13.03.30t", "13.03.30s"],
  ["validations", "13.15.30", ERROR_MESSAGE],
  ["validations", "13.03.42", ERROR_MESSAGE],
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
   "13.03.30s(+1m:2) second saturday",
   "13.04.13s(+1m:2) second saturday"],
  ["nth x of month",
   "13.05.12u(+1y:2) 2nd sunday in may",
   "14.05.11u(+1y:2) 2nd sunday in may"]]

def runTests():
  log = TestLog()
  for [group, before, after] in testCases:
    try:
      log.equal(bump(before, testDate), after, "%s ('%s')" % (group, before))
    except:
      print "ERROR on test \"%s\"" % before
      log.printSummaryReport()
      raise
  log.printReport()

################################################################################
## run program, aka "main"

def isTestMode():
  return getUserInput() == ""

if isTestMode():
  runTests()
else:
  sendUserOutput(bump(getUserInput()))
