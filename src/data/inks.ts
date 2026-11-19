// Canonical ink descriptions supplied by Shipmaster. Do not infer stock from this list.
export const inkNames = `019547 Green (Oyster)
10 Yellow
13 Yellow
2008 Green
2014 Green
2081 Green
21 Green
22 Green
24 Green
25 Green
29 Green
30 Blue
300 Blue
3086 Blue
31 Blue
32 Blue
3229 Blue
33 Blue
34 Blue
38 Blue
387 Blue
388 Blue
39 Blue
394 Blue
3M Red (Oyster)
485C Red
49 Purple
515251 Grey (Oyster)
52 Brown
609 Red
73 Red
74 Red
75 Red
76 Red
77 Red
78 Red
80 Orange
81 Orange
90 Black (Flexo)
9002 Grey
91 White
Any Blue
Any Colour
Cobb Coat 76 Red
Cobb Coat 90 Black
Customer Supplied Ink
HEX #003366 Blue
Hex #3D617D Blue
High Opacity White
PMS 021c Orange (Oyster)
PMS 032c Red
PMS 032u Red
PMS 072u Blue
PMS 131u Brown (oyster)
PMS 151c Orange
PMS 1795c Red
PMS 1805c Red
PMS 180c Red
PMS 185c Red
PMS 186C Red
PMS 187c Red
PMS 2172c Blue
PMS 2266c Green
PMS 2597c Purple
PMS 2617c Purple
PMS 2627c Purple
PMS 279C Blue
PMS 280C Blue (CxF Oyster)
PMS 281c Blue
PMS 285c Blue
PMS 286U Blue
PMS 2925u Blue
PMS 299u Blue
PMS 3005c Blue (Oyster)
PMS 3015u Blue
PMS 305c Blue (Oyster)
PMS 3165c Blue (Oyster)
PMS 3262c Green ((Oyster)
PMS 355c Green
PMS 375u Green
PMS 415c Grey (Oyster)
PMS 4255u Brown
PMS 425c Grey
PMS 426c Grey
PMS 432c Grey (Oyster)
PMS 4625U Brown
PMS 521c Purple
PMS 534c Blue
PMS 541c Blue
PMS 545u Blue SC
PMS 5c Cool Grey
PMS 627c Green
PMS 631c Blue
PMS 7620u SC Red
PMS 7625c Red
PMS 7643c Purple (KRAFT)
PMS 7686c Blue
PMS 7692c Blue
PMS 7731c Green
PMS 7c Cool Grey  (Oyster)
PMS 803c Yellow
PMS 8c Cool Grey
PMS Process Cyan-c (CxF Oyster)
Premium Black
Reflex Blue-C Kraft
Reflex Blue-U Oyster
Reynolds Blue
Royal Black
Super White
To be determined`.split("\n");

export type TestPail = { batchId: string; inkName: string; location: string; remainingPct: number; checkedOut: boolean; purged?: boolean; receivingWeightKg?: number; currentWeightKg?: number; demo: true };
const examples = [
  ["74 Red", "A-LL-01-1", 92], ["74 Red", "A-LL-01-2", 64], ["74 Red", "A-LL-01-3", 19],
  ["75 Red", "A-LL-02-1", 85], ["76 Red", "A-LL-02-2", 47], ["73 Red", "A-LL-02-3", 73],
  ["30 Blue", "A-ML-01-1", 100], ["30 Blue", "A-ML-01-2", 36], ["PMS 280C Blue (CxF Oyster)", "A-ML-01-3", 60],
  ["90 Black (Flexo)", "A-UL-01-1", 88], ["Premium Black", "A-UL-01-2", 24],
  ["10 Yellow", "B-LL-01-1", 91], ["13 Yellow", "B-LL-01-2", 43],
  ["24 Green", "B-ML-01-1", 80], ["PMS 355c Green", "B-ML-01-2", 15],
  ["High Opacity White", "B-UL-01-1", 96], ["Super White", "B-UL-01-2", 52],
  ["485C Red", "A-LL-03-1", 78], ["PMS 186C Red", "A-LL-04-1", 57],
  ["PMS 1795c Red", "A-LL-05-1", 32], ["PMS 185c Red", "A-LL-05-2", 68],
  ["609 Red", "A-LL-07-1", 44], ["PMS 7625c Red", "A-LL-08-2", 21],
  ["PMS 180c Red", "A-LL-09-1", 83], ["73 Red", "A-LL-10-1", 61],
  ["PMS 3005c Blue (Oyster)", "A-ML-02-1", 74], ["PMS 286U Blue", "A-ML-03-1", 51],
  ["PMS 541c Blue", "A-ML-04-1", 39], ["PMS 299u Blue", "A-ML-05-1", 86],
  ["PMS 305c Blue (Oyster)", "A-ML-06-1", 28], ["PMS 7686c Blue", "A-ML-07-1", 63],
  ["Reflex Blue-U Oyster", "A-ML-08-1", 95],
  ["Royal Black", "A-UL-02-1", 72], ["90 Black (Flexo)", "A-UL-03-1", 48],
  ["PMS 425c Grey", "A-UL-04-1", 33], ["PMS 432c Grey (Oyster)", "A-UL-05-1", 17],
  ["PMS 8c Cool Grey", "A-UL-06-1", 59], ["9002 Grey", "A-UL-07-1", 81],
  ["13 Yellow", "B-LL-02-1", 66], ["PMS 803c Yellow", "B-LL-03-1", 42],
  ["PMS 021c Orange (Oyster)", "B-LL-04-1", 29], ["80 Orange", "B-LL-05-1", 88],
  ["PMS 151c Orange", "B-LL-06-1", 54], ["10 Yellow", "B-LL-07-1", 73],
  ["PMS 355c Green", "B-ML-02-1", 62], ["PMS 2266c Green", "B-ML-03-1", 35],
  ["PMS 375u Green", "B-ML-04-1", 92], ["2014 Green", "B-ML-05-1", 46],
  ["PMS 7731c Green", "B-ML-06-1", 19], ["2008 Green", "B-ML-07-1", 77],
  ["Super White", "B-UL-02-1", 64], ["91 White", "B-UL-03-1", 31],
  ["High Opacity White", "B-UL-04-1", 82], ["PMS 2627c Purple", "B-UL-05-1", 26],
  ["PMS 2597c Purple", "B-UL-06-1", 58], ["PMS 4255u Brown", "B-UL-07-1", 43],
] as const;
export const testPails: TestPail[] = examples.map(([inkName, location, remainingPct], i) => ({
  batchId: `TEST-BATCH-${String(i + 1).padStart(4, "0")}`, inkName, location, remainingPct,
  checkedOut: false, receivingWeightKg: 18 + (i % 5), currentWeightKg: Math.round((18 + i % 5) * remainingPct) / 100, demo: true,
}));
