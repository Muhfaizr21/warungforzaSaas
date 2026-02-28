package helpers

import (
	"sync"
	"time"
)

// Simple In-Memory Cache
type InMemoryCache struct {
	items map[string]CacheItem
	mu    sync.RWMutex
}

type CacheItem struct {
	Value      interface{}
	Expiration int64
}

var Cache = &InMemoryCache{
	items: make(map[string]CacheItem),
}

// Set adds an item to the cache
func (c *InMemoryCache) Set(key string, value interface{}, duration time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.items[key] = CacheItem{
		Value:      value,
		Expiration: time.Now().Add(duration).UnixNano(),
	}
}

// Get retrieves an item from the cache
func (c *InMemoryCache) Get(key string) (interface{}, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	item, found := c.items[key]
	if !found {
		return nil, false
	}

	if time.Now().UnixNano() > item.Expiration {
		return nil, false
	}

	return item.Value, true
}

// Delete removes an item from the cache
func (c *InMemoryCache) Delete(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.items, key)
}

// Flush clears all cache
func (c *InMemoryCache) Flush() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items = make(map[string]CacheItem)
}
