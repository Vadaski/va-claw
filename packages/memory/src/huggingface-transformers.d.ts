declare module "@huggingface/transformers" {
  export const env: {
    cacheDir: string;
  };

  export function pipeline(
    task: "feature-extraction",
    model: string,
  ): Promise<
    (
      input: string,
      options: { pooling: "mean"; normalize: true },
    ) => Promise<{ data: ArrayLike<number> }>
  >;
}
