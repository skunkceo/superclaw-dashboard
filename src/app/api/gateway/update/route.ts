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
    // Update OpenClaw globally via npm as mike user
    const npmPath = '/home/mike/.nvm/versions/node/v24.13.0/bin/npm';
    await execAsync(
      `sudo -u mike ${npmPath} update -g openclaw`,
      { timeout: 120000 } // 120 second timeout for npm
    );

    // Restart the gateway using PM2 (simpler than openclaw gateway restart)
    const pm2Path = '/home/mike/.nvm/versions/node/v24.13.0/bin/pm2';
    await execAsync(
      `sudo -u mike ${pm2Path} restart clawdbot`,
      { timeout: 30000 }
    );

    return NextResponse.json({
      success: true,
      message: 'Update completed successfully. Gateway restarted.'
    });
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
      message: userMessage
    }, { status: 500 });
  }
}
