#!/usr/bin/env node

const Database = require('better-sqlite3');
const { join } = require('path');

async function runTests() {
  console.log('🔧 Critical Error Testing & Verification');
  console.log('==========================================\n');

  // Test 1: Database schema verification
  console.log('1. 📊 Database Schema Check:');
  try {
    const dataDir = process.env.SUPERCLAW_DATA_DIR || join(process.env.HOME || '/root', '.superclaw');
    const dbPath = join(dataDir, 'superclaw.db');
    const db = new Database(dbPath);
    
    // Check if columns exist
    const schema = db.prepare("PRAGMA table_info(agent_definitions)").all();
    const handoffCol = schema.find(col => col.name === 'handoff_rules');
    const enabledCol = schema.find(col => col.name === 'enabled');
    
    if (handoffCol) {
      console.log(`   ✅ handoff_rules column exists: ${handoffCol.type} DEFAULT ${handoffCol.dflt_value}`);
    } else {
      console.log('   ❌ handoff_rules column MISSING');
    }
    
    if (enabledCol) {
      console.log(`   ✅ enabled column exists: ${enabledCol.type} DEFAULT ${enabledCol.dflt_value}`);
    } else {
      console.log('   ❌ enabled column MISSING');
    }
    
    // Test reading data
    const agents = db.prepare('SELECT name, handoff_rules, enabled FROM agent_definitions LIMIT 3').all();
    console.log(`   ✅ Successfully read ${agents.length} agents from database`);
    
    // Check for NULL or invalid handoff_rules
    const invalidRules = db.prepare("SELECT name FROM agent_definitions WHERE handoff_rules IS NULL OR handoff_rules = ''").all();
    if (invalidRules.length > 0) {
      console.log(`   ⚠️  ${invalidRules.length} agents have empty handoff_rules:`, invalidRules.map(a => a.name).join(', '));
    } else {
      console.log('   ✅ All agents have valid handoff_rules');
    }
    
    db.close();
  } catch (error) {
    console.log('   ❌ Database error:', error.message);
  }

  // Test 2: Verify no "errors" table references  
  console.log('\n2. 🗃️ Missing Table References:');
  try {
    const fs = require('fs');
    const path = require('path');
    
    function findTableReferences(dir, tableName) {
      const refs = [];
      const files = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
          refs.push(...findTableReferences(fullPath, tableName));
        } else if (file.name.endsWith('.ts') || file.name.endsWith('.js')) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes(`FROM ${tableName}`) || content.includes(`from ${tableName}`) || 
                content.includes(`TABLE ${tableName}`) || content.includes(`table ${tableName}`)) {
              refs.push(fullPath);
            }
          } catch (e) {
            // Skip unreadable files
          }
        }
      }
      return refs;
    }
    
    const errorTableRefs = findTableReferences('/home/mike/apps/websites/superclaw-dashboard/src', 'errors');
    if (errorTableRefs.length > 0) {
      console.log('   ⚠️  Found potential "errors" table references:');
      errorTableRefs.forEach(ref => console.log(`      ${ref}`));
    } else {
      console.log('   ✅ No "errors" table references found');
    }
    
  } catch (error) {
    console.log('   ❌ File search error:', error.message);
  }

  // Test 3: Check for bash date parsing patterns
  console.log('\n3. 📅 Bash Date Parsing Check:');
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Test for common date parsing errors
    const testDate = '2026-02-16T10:30:00';
    
    // This would cause the error - direct arithmetic on ISO date
    try {
      await execAsync(`bash -c 'echo $((${testDate.split('T')[0].replace(/-/g, '')} + 1))'`);
      console.log('   ✅ Basic date arithmetic works');
    } catch (error) {
      if (error.message.includes('value too great for base')) {
        console.log('   ❌ Found the bash date parsing issue!');
        console.log('      Problem: Direct arithmetic on ISO date format');
        console.log('      Fix: Use date -d or date +%s for conversions');
      }
    }
    
    // Correct way to handle dates
    try {
      const { stdout } = await execAsync(`date -d '${testDate}' +%s`);
      console.log('   ✅ Correct date parsing works: epoch', stdout.trim());
    } catch (error) {
      console.log('   ⚠️  Date command issue:', error.message);
    }
    
  } catch (error) {
    console.log('   ❌ Date test error:', error.message);
  }

  // Test 4: Dashboard API health  
  console.log('\n4. 🌐 Dashboard API Health:');
  try {
    const http = require('http');
    
    const testEndpoint = (path) => {
      return new Promise((resolve) => {
        const req = http.request({
          hostname: 'localhost',
          port: 3077,
          path: path,
          method: 'GET'
        }, (res) => {
          resolve({ status: res.statusCode, path });
        });
        
        req.on('error', () => {
          resolve({ status: 'ERROR', path });
        });
        
        req.setTimeout(2000, () => {
          resolve({ status: 'TIMEOUT', path });
        });
        
        req.end();
      });
    };
    
    const endpoints = [
      '/api/status',
      '/api/agents/definitions', 
      '/api/errors'
    ];
    
    for (const endpoint of endpoints) {
      const result = await testEndpoint(endpoint);
      if (result.status === 200) {
        console.log(`   ✅ ${endpoint}: OK`);
      } else if (result.status === 401) {
        console.log(`   ⚠️  ${endpoint}: Unauthorized (expected - needs auth)`);
      } else {
        console.log(`   ❌ ${endpoint}: ${result.status}`);
      }
    }
    
  } catch (error) {
    console.log('   ❌ API test error:', error.message);
  }

  console.log('\n🎯 Summary:');
  console.log('================');
  console.log('If all checks show ✅ or expected ⚠️ warnings, the critical issues may be:');
  console.log('1. In session logs that are older or in different locations');
  console.log('2. Related to specific user interactions not captured here');
  console.log('3. Resolved already and no longer occurring');
  console.log('\nNext steps: Check recent session logs for actual error occurrences');
}

runTests().catch(console.error);