import { getDocs, query, collection, db } from './src/lib/firebase';

async function run() {
  const q = query(collection(db, 'users'));
  const snap = await getDocs(q);
  console.log(snap.docs.slice(0, 3).map(d => {
     const data = d.data();
     return {
         id: d.id,
         competitionName: data.competitionName,
         displayName: data.displayName
     };
  }));
}
run();
