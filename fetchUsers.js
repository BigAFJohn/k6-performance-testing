import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const {
  DATABASE_HOST,
  DATABASE_PORT,
  DATABASE_NAME,
  DATABASE_USERNAME,
  DATABASE_PASSWORD,
} = process.env;

async function main() {
  let connection; 
  try {
    // Create a MySQL connection
    connection = await mysql.createConnection({
      host: DATABASE_HOST,
      port: DATABASE_PORT,
      user: DATABASE_USERNAME,
      password: DATABASE_PASSWORD,
      database: DATABASE_NAME,
    });
    console.log('✅ Database connection established.');

    // 1. Fetch all users
    const [users] = await connection.query('SELECT * FROM user');
    console.log(`✅ Fetched ${users.length} users from the 'user' table.`);

    // 2. Fetch all prayers
    const [prayers] = await connection.query('SELECT * FROM prayer');
    console.log(`✅ Fetched ${prayers.length} prayers from the 'prayer' table.`);

    if (prayers.length > 0) {
      console.log('--- DEBUG: Sample Prayer Record (first 5) ---');
      console.log(prayers.slice(0, 5)); // Log the first 5 prayer records
      console.log('-------------------------------------------');
    } else {
      console.log('--- DEBUG: No prayer records found in the database. ---');
    }

    // 3. Fetch all testimonies
    const [testimonies] = await connection.query('SELECT * FROM testimony');
    console.log(`✅ Fetched ${testimonies.length} testimonies from the 'testimony' table.`);

    // 4. Fetch all comments
    const [comments] = await connection.query('SELECT * FROM comment');
    console.log(`✅ Fetched ${comments.length} comments from the 'comment' table.`);

    // Convert rows to arrays of plain objects for easier manipulation
    const usersArray = Array.isArray(users) ? users.map(user => ({ ...user })) : [];
    const prayersArray = Array.isArray(prayers) ? prayers.map(prayer => ({ ...prayer })) : [];
    const testimoniesArray = Array.isArray(testimonies) ? testimonies.map(testimony => ({ ...testimony })) : [];
    const commentsArray = Array.isArray(comments) ? comments.map(comment => ({ ...comment })) : [];

    // Build a map for quick lookup of prayers, testimonies, and comments by their UUIDs or foreign keys
    const prayersByUuid = new Map(prayersArray.map(p => [p.uuid, { ...p, testimonies: [], comments: [] }]));
    const testimoniesByUuid = new Map(testimoniesArray.map(t => [t.uuid, { ...t, comments: [] }]));
    const commentsByUuid = new Map(commentsArray.map(c => [c.uuid, { ...c }])); 

    // Link comments to testimonies or prayers
    for (const comment of commentsArray) {
      if (comment.testimony_uuid && testimoniesByUuid.has(comment.testimony_uuid)) {
        testimoniesByUuid.get(comment.testimony_uuid).comments.push(comment);
      } else if (comment.prayer_uuid && prayersByUuid.has(comment.prayer_uuid)) {
        prayersByUuid.get(comment.prayer_uuid).comments.push(comment);
      }
    }

    // Link testimonies to prayers
    for (const testimony of testimoniesArray) {
      if (testimony.prayer_uuid && prayersByUuid.has(testimony.prayer_uuid)) {
        prayersByUuid.get(testimony.prayer_uuid).testimonies.push(testimony);
      }
    }

    // Link prayers to users
    const usersWithDetails = usersArray.map(user => {
      const userPrayers = prayersArray.filter(prayer => prayer.userId === user.id)
        .map(prayer => {
          const prayerDetails = prayersByUuid.get(prayer.uuid);
    
          return {
            ...prayerDetails,
            testimonies: prayerDetails.testimonies.map(t => {
              const testimonyDetails = testimoniesByUuid.get(t.uuid);
              return {
                ...testimonyDetails,
                comments: testimonyDetails.comments
              };
            }),
            comments: prayerDetails.comments 
          };
        });
      return { ...user, prayers: userPrayers };
    });

    // Save results to a file
    const filePath = './usersListWithDetails.json';
    fs.writeFileSync(filePath, JSON.stringify(usersWithDetails, null, 2)); 
    console.log(`✅ Full user details with prayers, testimonies, and comments saved to ${filePath}`);
  } catch (err) {
    console.error('❌ Error fetching users and their details:', err);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed.');
    }
  }
}

main().catch((err) => {
  console.error('❌ Fatal error in main function execution:', err);
  process.exit(1);
});
