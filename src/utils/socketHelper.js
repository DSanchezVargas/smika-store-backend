const emitSocketEvent = (req, eventName, data) => {
  const io = req.app.get("io");

  if (io) {
    io.emit(eventName, data);
  }
};

module.exports = { emitSocketEvent };