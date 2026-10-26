// Shop-TV seasons. Edit the dates here. No build step.
// Dates are month-day in America/New_York. A window that crosses New Year
// is written with the later month first, for example 12-31 through 01-07.
// Holidays are checked top to bottom. The first match is the board for that day.
// Boiler season is the heating backdrop: it plays on its own between holidays,
// and a few of its slides are mixed into any holiday marked mixBoiler.
// Halloween is the exception. It plays only its clips, the way it always has.
(function (root) {
  root.BOARD_SETTINGS = {
    timezone: "America/New_York",
    // After this many holiday cards, insert one boiler-season card.
    boilerMixEvery: 2,
    boilerSeason: { start: "10-01", end: "03-31" },
    // Used when today is not in a holiday and not in boiler season.
    fallback: "shop",
    holidays: [
      { id: "newyear", label: "New Year", start: "12-31", end: "01-07", mixBoiler: true },
      { id: "christmas", label: "Christmas", start: "12-01", end: "12-30", mixBoiler: true },
      { id: "thanksgiving", label: "Thanksgiving", when: "week-of-thanksgiving", mixBoiler: true },
      { id: "halloween", label: "Halloween", start: "10-01", end: "11-01", mixBoiler: false },
      { id: "valentines", label: "Valentine's Day", start: "02-07", end: "02-14", mixBoiler: true },
      { id: "stpatricks", label: "St. Patrick's Day", start: "03-10", end: "03-17", mixBoiler: true },
      { id: "july4", label: "Fourth of July", start: "06-28", end: "07-05", mixBoiler: false }
    ]
  };
})(typeof window !== "undefined" ? window : globalThis);
