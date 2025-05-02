// src/utils/queue-utils.js
// Request queue manager with fixed recursion issue
export const requestQueue = {
    queue: [],
    inProgress: new Map(),
    maxConcurrent: 3, // Maximum concurrent requests
    processingDelay: 300, // Delay between processing batches (ms)
    
    enqueue(key, promiseFactory) {
      return new Promise((resolve, reject) => {
        // If this exact request is already in progress, return that promise
        if (this.inProgress.has(key)) {
          return this.inProgress.get(key).then(resolve).catch(reject);
        }
        
        // Create the request promise - FIXED to prevent recursion
        const executeRequest = async () => {
          try {
            // Store the promise itself, not the function creating the promise
            const promise = promiseFactory();
            this.inProgress.set(key, promise);
            
            const result = await promise;
            resolve(result);
            return result;
          } catch (error) {
            reject(error);
            throw error;
          } finally {
            this.inProgress.delete(key);
            this.processQueue();
          }
        };
        
        // Add to queue if we're at max concurrent requests
        if (this.inProgress.size >= this.maxConcurrent) {
          this.queue.push({ key, execute: executeRequest, resolve, reject });
        } else {
          // Execute immediately if under the limit
          executeRequest();
        }
      });
    },
    
    processQueue() {
      if (this.queue.length === 0 || this.inProgress.size >= this.maxConcurrent) return;
      
      // Process next item in queue
      const nextItem = this.queue.shift();
      nextItem.execute();
      
      // Schedule next processing
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), this.processingDelay);
      }
    }
  };