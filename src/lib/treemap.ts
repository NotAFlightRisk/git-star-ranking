export interface Tile<T> {
  item: T;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Sized<T> {
  item: T;
  area: number;
}

const total = <T>(row: Sized<T>[]) => row.reduce((sum, { area }) => sum + area, 0);

// how far from square the worst tile in a row would be, laid along a side this long
function worst<T>(row: Sized<T>[], side: number) {
  const sum = total(row);
  const areas = row.map(({ area }) => area);
  const [most, least] = [Math.max(...areas), Math.min(...areas)];
  return Math.max((side * side * most) / (sum * sum), (sum * sum) / (side * side * least));
}

/** Squarified treemap: rows of tiles kept as near square as the sizes allow. Biggest first */
export function squarify<T>(items: T[], size: (item: T) => number, width = 1, height = 1) {
  const scale = (width * height) / items.reduce((sum, item) => sum + size(item), 0);
  const queue = items.map((item) => ({ item, area: size(item) * scale })).filter((s) => s.area);
  const tiles: Tile<T>[] = [];
  let [x, y, w, h] = [0, 0, width, height];
  let row: Sized<T>[] = [];

  const lay = () => {
    const thick = total(row) / Math.min(w, h);
    let along = 0;
    for (const { item, area } of row) {
      const long = area / thick;
      tiles.push(
        w >= h
          ? { item, x, y: y + along, width: thick, height: long }
          : { item, x: x + along, y, width: long, height: thick }
      );
      along += long;
    }
    if (w >= h) [x, w] = [x + thick, w - thick];
    else [y, h] = [y + thick, h - thick];
    row = [];
  };

  for (const next of queue) {
    const side = Math.min(w, h);
    if (row.length && worst([...row, next], side) > worst(row, side)) lay();
    row.push(next);
  }
  if (row.length) lay();
  return tiles;
}
