const EventEmitter = require("events");

class Poller extends EventEmitter {
  /**
   * @param {int} timeout
   */
  constructor (timeout = 1000) {
    super();
    this.timeout = timeout;
  }

  poll () {
    setTimeout(() => this.emit("poll"), this.timeout);
  }

  onPoll (cb) {
    this.on("poll", cb);
  }
}

module.exports = Poller;
