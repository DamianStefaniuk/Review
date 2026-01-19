const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code'
const GITHUB_OAUTH_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_API_URL = 'https://api.github.com'

// Get config
async function getConfig() {
  const response = await fetch('./data/config.json')
  return response.json()
}

// Step 1: Start Device Flow
export async function startDeviceFlow() {
  const config = await getConfig()

  const response = await fetch(GITHUB_DEVICE_CODE_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: config.github.oauthClientId,
      scope: 'read:user read:org'
    })
  })

  return response.json()
  // Returns: { device_code, user_code, verification_uri, expires_in, interval }
}

// Step 2: Polling - wait for authorization
export async function pollForToken(deviceCode, interval = 5) {
  const config = await getConfig()

  const response = await fetch(GITHUB_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: config.github.oauthClientId,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
    })
  })

  return response.json()
  // Returns: { access_token, token_type, scope } or { error: 'authorization_pending' }
}

// Step 3: Fetch user data
export async function fetchUser(token) {
  const response = await fetch(`${GITHUB_API_URL}/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  })

  if (!response.ok) throw new Error('Failed to fetch user')
  return response.json()
}

// Step 4: Check organization membership
export async function checkOrgMembership(token, org) {
  const response = await fetch(`${GITHUB_API_URL}/user/orgs`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  })

  if (!response.ok) return false

  const orgs = await response.json()
  return orgs.some(o => o.login.toLowerCase() === org.toLowerCase())
}

// Full login flow
export async function login() {
  const config = await getConfig()

  // 1. Start device flow
  const deviceData = await startDeviceFlow()

  // 2. Return data to display to user
  return {
    userCode: deviceData.user_code,
    verificationUri: deviceData.verification_uri,
    expiresIn: deviceData.expires_in,

    // 3. Polling function
    waitForAuth: async () => {
      const interval = deviceData.interval * 1000
      const maxAttempts = Math.ceil(deviceData.expires_in / deviceData.interval)

      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, interval))

        const tokenData = await pollForToken(deviceData.device_code)

        if (tokenData.access_token) {
          // 4. Fetch user
          const user = await fetchUser(tokenData.access_token)

          // 5. Check organization membership
          const isMember = await checkOrgMembership(
            tokenData.access_token,
            config.github.organization
          )

          if (!isMember) {
            throw new Error(`Musisz należeć do organizacji ${config.github.organization}`)
          }

          return {
            token: tokenData.access_token,
            user: {
              id: user.id,
              login: user.login,
              name: user.name,
              avatarUrl: user.avatar_url,
              email: user.email
            }
          }
        }

        if (tokenData.error && tokenData.error !== 'authorization_pending') {
          throw new Error(tokenData.error_description || tokenData.error)
        }
      }

      throw new Error('Czas na autoryzację minął')
    }
  }
}
