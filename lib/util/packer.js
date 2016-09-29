export function pack(o) {
  return JSON.stringify(o);
}

export function unpack(s) {
  try {
    return JSON.parse(s);
  } catch (e) {
    return {};
  }
}
