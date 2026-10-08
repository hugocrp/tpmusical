export interface Cache<K, V> {
  get(key: K): Promise<V | undefined>;
  set(key: K, value: V): Promise<void>;
}
