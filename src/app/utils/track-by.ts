export const trackById = <T extends { id?: string | number }>(
  index: number,
  item: T,
) => item?.id ?? index;

export const trackByIndex = (index: number) => index;

export const trackByValue = <T extends { value?: string | number }>(
  index: number,
  item: T,
) => item?.value ?? index;

export const trackByText = <T extends { text?: string }>(
  index: number,
  item: T,
) => item?.text ?? index;

export const trackByType = <T extends { type?: string | number }>(
  index: number,
  item: T,
) => item?.type ?? index;
