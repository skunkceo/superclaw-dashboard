import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get current version before update
    const { stdout: versionBefore } = await execAsync('openclaw --version');
    const currentVersion = versionBefore.trim();

    // Update OpenClaw globally via npm as mike user
    const npmPath = '/home/mike/.nvm/versions/node/v24.13.0/bin/npm';
    await execAsync(
      `sudo -u mike ${npmPath} update -g openclaw`,
      { timeout: 120000 } // 120 second timeout for npm
    );

    // Get new version
    const { stdout: versionAfter } = await execAsync('openclaw --version');
    const newVersion = versionAfter.trim();

    // Respond immediately BEFORE restarting (so client gets the response)
    const response = NextResponse.json({
      success: true,
      message: `Updated from ${currentVersion} to ${newVersion}. Gateway restarting...`,
      oldVersion: currentVersion,
      newVersion: newVersion,
      restarting: true
    });

    // Fire-and-forget restart after response is queued
    // Use setImmediate to ensure response is sent first
    setImmediate(() => {
      const pm2Path = '/home/mike/.nvm/versions/node/v24.13.0/bin/pm2';
      exec(`sudo -u mike ${pm2Path} restart clawdbot`, (error) => {
        if (error) {
          console.error('PM2 restart error:', error);
        }
      });
    });

    return response;
  } catch (error: any) {
    console.error('Gateway update failed:', error);
    
    // Simplify error message - hide technical details
    let userMessage = 'Update failed. Please try again or update manually.';
    
    if (error.message?.includes('EACCES') || error.stderr?.includes('EACCES')) {
      userMessage = 'Permission error during update. Please update manually via CLI.';
    } else if (error.message?.includes('timeout')) {
      userMessage = 'Update timed out. Please check your connection and try again.';
    } else if (error.stderr?.includes('npm ERR!')) {
      userMessage = 'npm update failed. Please check the manual update command.';
    }
    
    return NextResponse.json({
      success: false,
      message: userMessage,
      error: error.message
    }, { status: 500 });
  }
}
