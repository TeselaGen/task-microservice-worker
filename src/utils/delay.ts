export const delay = (milliseconds: number): Promise<undefined> => {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
};
