// Turns a calendar day into the theme the board should play.
// Loaded as a plain script. Also runs under Node for scripts/check-schedule.mjs.
(function (root) {
  var settings = root.BOARD_SETTINGS;

  function parseMD(value) {
    var m = /^(\d{1,2})-(\d{1,2})$/.exec(value || "");
    if (!m) return null;
    return { month: Number(m[1]), day: Number(m[2]) };
  }

  function stamp(month, day) {
    return month * 100 + day;
  }

  function inWindow(month, day, start, end) {
    var x = stamp(month, day);
    var a = stamp(start.month, start.day);
    var b = stamp(end.month, end.day);
    if (a <= b) return x >= a && x <= b;
    return x >= a || x <= b;
  }

  function weekday(year, month, day) {
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  }

  function thanksgivingDay(year) {
    var found = 0;
    var day;
    for (day = 1; day <= 30; day++) {
      if (weekday(year, 11, day) === 4) {
        found++;
        if (found === 4) return day;
      }
    }
    return 26;
  }

  function inThanksgivingWeek(year, month, day) {
    if (month !== 11) return false;
    var tg = thanksgivingDay(year);
    var sunday = tg - weekday(year, 11, tg);
    return day >= sunday && day <= sunday + 6;
  }

  function inBoilerSeason(parts) {
    var w = settings.boilerSeason || {};
    var start = parseMD(w.start);
    var end = parseMD(w.end);
    if (!start || !end) return false;
    return inWindow(parts.month, parts.day, start, end);
  }

  function holidayMatches(holiday, parts) {
    if (holiday.when === "week-of-thanksgiving") {
      return inThanksgivingWeek(parts.year, parts.month, parts.day);
    }
    var start = parseMD(holiday.start);
    var end = parseMD(holiday.end);
    if (!start || !end) return false;
    return inWindow(parts.month, parts.day, start, end);
  }

  function pack(theme, label, mixBoiler, parts) {
    return {
      theme: theme,
      label: label,
      mixBoiler: !!mixBoiler,
      inBoilerSeason: inBoilerSeason(parts)
    };
  }

  function resolve(parts) {
    var list = settings.holidays || [];
    var i;
    for (i = 0; i < list.length; i++) {
      if (holidayMatches(list[i], parts)) {
        var mix = !!list[i].mixBoiler && inBoilerSeason(parts);
        return pack(list[i].id, list[i].label, mix, parts);
      }
    }
    if (inBoilerSeason(parts)) return pack("boiler", "Heating season", false, parts);
    return pack(settings.fallback || "shop", "Shop", false, parts);
  }

  function describe(id, parts) {
    if (id === "boiler") return pack("boiler", "Heating season", false, parts);
    if (id === (settings.fallback || "shop")) return pack(id, "Shop", false, parts);
    var list = settings.holidays || [];
    var i;
    for (i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        var mix = !!list[i].mixBoiler && inBoilerSeason(parts);
        return pack(id, list[i].label, mix, parts);
      }
    }
    return null;
  }

  root.BOARD_SCHEDULE = {
    parseMD: parseMD,
    inWindow: inWindow,
    weekday: weekday,
    thanksgivingDay: thanksgivingDay,
    inBoilerSeason: inBoilerSeason,
    resolve: resolve,
    describe: describe
  };
})(typeof window !== "undefined" ? window : globalThis);
