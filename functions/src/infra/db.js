const { initializeApp } = require("firebase-admin/app")
const { getFirestore, Timestamp } = require("firebase-admin/firestore")

let app = null
let db = null

function getDb() {
  if (db) return db

  app ||= initializeApp()
  db = getFirestore(app)
  return db
}

async function setDoc(collectionName, docId, data) {
  const currentDb = getDb()
  await currentDb.collection(collectionName).doc(docId).set(data, { merge: true })
}

async function getDoc(collectionName, docId) {
  const currentDb = getDb()
  const snap = await currentDb.collection(collectionName).doc(docId).get()
  return snap.exists ? snap.data() : null
}

module.exports = {
  Timestamp,
  setDoc,
  getDoc,
}
