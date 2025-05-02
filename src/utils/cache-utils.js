// src/utils/cache-utils.js
import { requestQueue } from './queue-utils.js';

// Request cache to prevent duplicate requests
export const requestCache = {
  cache: new Map(),
  ttl: 30000, // Default TTL: 30 seconds
  
  async get(key, promiseFactory, customTtl = null) {
    const now = Date.now();
    const cached = this.cache.get(key);
    
    // Return cached value if valid
    if (cached && now - cached.timestamp < (customTtl || this.ttl)) {
      return cached.data;
    }
    
    // Generate a cache key for the request queue
    const queueKey = `request_${key}`;
    
    // Execute request through the queue
    try {
      const data = await requestQueue.enqueue(queueKey, () => promiseFactory());
      
      // Cache the result
      this.cache.set(key, {
        data,
        timestamp: now
      });
      
      return data;
    } catch (error) {
      // If error, still cache error response but with shorter TTL
      if (error.response) {
        this.cache.set(key, {
          data: { error: error.response.data?.error || 'Request failed' },
          timestamp: now - (this.ttl - 5000) // Shorter TTL for errors
        });
      }
      throw error;
    }
  },
  
  invalidate(key) {
    this.cache.delete(key);
  },
  
  clear() {
    this.cache.clear();
  }
};