// Migration: Fix admin name in conversations
// This ensures all admin conversations show "Admin" instead of "School Administration"

require('dotenv').config();
const pool = require('../config/db');

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting migration: Remove duplicate admin conversations...');
    
    await client.query('BEGIN');
    
    // Find all conversations with admin_1 for each guardian
    const duplicates = await client.query(`
      SELECT 
        cp1.conversation_id,
        cp1.user_id as guardian_id,
        c.created_at,
        c.last_message_at,
        COUNT(*) OVER (PARTITION BY cp1.user_id) as conversation_count,
        ROW_NUMBER() OVER (PARTITION BY cp1.user_id ORDER BY c.created_at ASC) as row_num
      FROM conversation_participants cp1
      JOIN conversations c ON c.id = cp1.conversation_id
      WHERE cp1.conversation_id IN (
        SELECT conversation_id 
        FROM conversation_participants 
        WHERE user_id = 'admin_1'
      )
      AND cp1.user_id != 'admin_1'
      AND cp1.user_type = 'guardian'
      ORDER BY cp1.user_id, c.created_at ASC
    `);
    
    console.log(`Found ${duplicates.rowCount} total admin conversations`);
    
    // Keep only the NEWEST conversation (highest created_at) for each guardian
    // Delete all OLDER conversations (lower created_at)
    const conversationsToDelete = [];
    
    for (const row of duplicates.rows) {
      if (row.conversation_count > 1 && row.row_num < row.conversation_count) {
        // This is an older conversation (not the last one), mark for deletion
        conversationsToDelete.push(row.conversation_id);
        console.log(`Marking conversation ${row.conversation_id} for deletion (created: ${row.created_at})`);
      }
    }
    
    console.log(`Found ${conversationsToDelete.length} duplicate conversations to delete`);
    
    if (conversationsToDelete.length > 0) {
      // Delete messages in old conversations
      const deleteMessages = await client.query(`
        DELETE FROM messages 
        WHERE conversation_id = ANY($1)
        RETURNING id
      `, [conversationsToDelete]);
      
      console.log(`Deleted ${deleteMessages.rowCount} messages from old conversations`);
      
      // Delete conversation participants
      const deleteParticipants = await client.query(`
        DELETE FROM conversation_participants 
        WHERE conversation_id = ANY($1)
        RETURNING id
      `, [conversationsToDelete]);
      
      console.log(`Deleted ${deleteParticipants.rowCount} participants from old conversations`);
      
      // Delete old conversations
      const deleteConversations = await client.query(`
        DELETE FROM conversations 
        WHERE id = ANY($1)
        RETURNING id
      `, [conversationsToDelete]);
      
      console.log(`Deleted ${deleteConversations.rowCount} old conversations`);
    }
    
    // Verify - check remaining conversations per guardian
    const remaining = await client.query(`
      SELECT 
        cp1.user_id as guardian_id,
        COUNT(DISTINCT cp1.conversation_id) as conversation_count
      FROM conversation_participants cp1
      WHERE cp1.conversation_id IN (
        SELECT conversation_id 
        FROM conversation_participants 
        WHERE user_id = 'admin_1'
      )
      AND cp1.user_id != 'admin_1'
      GROUP BY cp1.user_id
      HAVING COUNT(DISTINCT cp1.conversation_id) > 1
    `);
    
    if (remaining.rowCount > 0) {
      console.log('⚠️  Still have duplicates:', remaining.rows);
    } else {
      console.log('✅ No duplicate conversations remaining');
    }
    
    await client.query('COMMIT');
    console.log('Migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    // Don't end the pool - the app needs it!
  }
}

// Run if called directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = runMigration;
