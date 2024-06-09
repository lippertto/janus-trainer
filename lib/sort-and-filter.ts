export function sortNamed(a: { name: string }, b: { name: string }): number {
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
}

type ElementWithId = { id: number | string }

export function replaceElementWithId<T extends ElementWithId>(array: T[], value: T) {
  let found = false;
  const result = array.map((d) => {
    if (d.id === value.id) {
      if (found) {
        console.error(`Element with id ${value.id} replaced multiple times.`);
      }
      found = true;
      return value;
    } else {
      return d;
    }
  });
  if (!found) {
    console.error(`Wanted to update element with id ${value.id}, but it was not found`);
  }
  return result;
}