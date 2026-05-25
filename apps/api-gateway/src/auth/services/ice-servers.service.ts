import { Injectable } from '@nestjs/common';
import { IIceServersService } from '@app/contracts/interfaces/service';

@Injectable()
export class IceServersService implements IIceServersService {
  async getIceServers(): Promise<{ iceServers: object[] }> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fallback = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    if (!accountSid || !authToken) return fallback;

    try {
      // Ask Twilio for short-lived TURN credentials. If that fails, callers can
      // still connect with public STUN servers for best-effort WebRTC setup.
      const credentials = Buffer.from(`${accountSid}:${authToken}`).toString(
        'base64',
      );
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Tokens.json`,
        {
          method: 'POST',
          headers: { Authorization: `Basic ${credentials}` },
        },
      );
      const data = (await response.json()) as any;
      return { iceServers: data.ice_servers ?? fallback.iceServers };
    } catch {
      return fallback;
    }
  }
}
