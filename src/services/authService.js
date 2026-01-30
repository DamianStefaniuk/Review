const GITHUB_API_URL = 'https://api.github.com'

// Get config
async function getConfig() {
  const response = await fetch('./data/config.json')
  return response.json()
}

// Validate PAT token and fetch user data
export async function validateToken(token) {
  const response = await fetch(`${GITHUB_API_URL}/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Nieprawidłowy token. Sprawdź czy token jest poprawny i nie wygasł.')
    }
    throw new Error('Błąd połączenia z GitHub API')
  }

  // Validate required scopes
  const scopes = response.headers.get('x-oauth-scopes') || ''
  const scopeList = scopes.split(',').map(s => s.trim()).filter(Boolean)
  const requiredScopes = ['repo']
  const hasRequiredScopes = requiredScopes.every(s => scopeList.includes(s))

  if (!hasRequiredScopes) {
    throw new Error('Token wymaga uprawnień: ' + requiredScopes.join(', ') + '. Aktualne uprawnienia: ' + (scopeList.length ? scopeList.join(', ') : 'brak'))
  }

  return response.json()
}

// Check organization membership
export async function checkOrgMembership(token, org) {
  // Try direct membership endpoint first (most reliable)
  const membershipResponse = await fetch(`${GITHUB_API_URL}/user/memberships/orgs/${org}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  })

  // 200 = is a member, 404 = not a member, 403 = no permission to check
  if (membershipResponse.ok) {
    const membership = await membershipResponse.json()
    return membership.state === 'active'
  }

  if (membershipResponse.status === 404) {
    return false // Not a member
  }

  // Fallback to /user/orgs if membership endpoint fails (e.g., 403)
  const orgsResponse = await fetch(`${GITHUB_API_URL}/user/orgs`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  })

  if (!orgsResponse.ok) {
    throw new Error('Nie udało się sprawdzić członkostwa w organizacji. Upewnij się, że token ma uprawnienie "read:org".')
  }

  const orgs = await orgsResponse.json()
  return orgs.some(o => o.login.toLowerCase() === org.toLowerCase())
}

// Full login with PAT
export async function loginWithPAT(token) {
  const config = await getConfig()

  // 1. Validate token and get user
  const user = await validateToken(token)

  // 2. Check organization membership
  const isMember = await checkOrgMembership(token, config.github.organization)

  if (!isMember) {
    throw new Error(`Musisz należeć do organizacji "${config.github.organization}" aby uzyskać dostęp.`)
  }

  // 3. Return auth data
  return {
    token: token,
    user: {
      id: user.id,
      login: user.login,
      name: user.name,
      avatarUrl: user.avatar_url,
      email: user.email
    }
  }
}
