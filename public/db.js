const indexedDB =
  window.indexedDB ||
  window.mozIndexedDB ||
  window.webkitIndexedDB ||
  window.msIndexedDB ||
  window.shimIndexedDB;

let db;

//opening a connection to the indexedDB database with a version that updates every time we write to the database
const request = indexedDB.open('budget', 1);

//below are the event requests
//onupgradeneeded: when something new is added, then get target.result and store pending data (for when offline)

request.onupgradeneeded = ({ target }) => {
  let db = target.result;
  db.createObjectStore('pending', { autoIncrement: true });
};

request.onsuccess = ({ target }) => {
  db = target.result;

  // check if app is online before reading from db
  if (navigator.onLine) {
    checkDatabase();
  }
};

request.onerror = function (event) {
  console.log('Woops! ' + event.target.errorCode);
};

//if unable to push to monogodb and push fails, then saveRecord for "pending" data
function saveRecord(record) {
  const transaction = db.transaction(['pending'], 'readwrite');
  const store = transaction.objectStore('pending');

  store.add(record);
}

//when we are back online, run checkDatabase: retrieve "pending" objectstore from time offline with transaction
//then use bulk api call to insert multiple records into the mongodb
//return response.json
//clear "pending" store

function checkDatabase() {
  const transaction = db.transaction(['pending'], 'readwrite');
  const store = transaction.objectStore('pending');
  const getAll = store.getAll();

  getAll.onsuccess = function () {
    if (getAll.result.length > 0) {
      fetch('/api/transaction/bulk', {
        method: 'POST',
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
        },
      })
        .then((response) => {
          return response.json();
        })
        .then(() => {
          // delete records if successful
          const transaction = db.transaction(['pending'], 'readwrite');
          const store = transaction.objectStore('pending');
          store.clear();
        });
    }
  };
}

// listen for app coming back online
window.addEventListener('online', checkDatabase);
