/**
 * Simple userland heapdump generator using v8-profiler
 * Usage: require('[path_to]/HeapDump').init('datadir')
 *
 * @module HeapDump
 * @type {exports}
 */

var fs = require('fs');
var profiler = require('v8-profiler');
var _datadir = null;
var nextMBThreshold = 0;


/**
 * Init and scheule heap dump runs
 *
 * @param datadir Folder to save the data to
 */
exports.init = function (datadir) {
    _datadir = datadir;
    setInterval(tickHeapDump, 500);
};

/**
 * Schedule a heapdump by the end of next tick
 */
function tickHeapDump() {
    setImmediate(function () {
        heapDump();
    });
}

/**
 * Creates a heap dump if the currently memory threshold is exceeded
 */
function heapDump() {
    var memMB = process.memoryUsage().rss / 1048576;

    console.log(memMB + '>' + nextMBThreshold);

    if (memMB > nextMBThreshold) {
        console.log('Current memory usage: %j', process.memoryUsage());
        nextMBThreshold += 50;
        var snap = profiler.takeSnapshot('profile');
        saveHeapSnapshot(snap, _datadir);
    }
}

/**
 * Saves a given snapshot
 *
 * @param snapshot Snapshot object
 * @param datadir Location to save to
 */
function saveHeapSnapshot(snapshot, datadir) {
    var buffer = '';
    var stamp = Date.now();
    snapshot.serialize(
        function iterator(data, length) {
            buffer += data;
        }, function complete() {

            var name = stamp + '.heapsnapshot';
            fs.writeFile(datadir + '/' + name , buffer, function () {
                console.log('Heap snapshot written to ' + name);
            });
        }
    );
}