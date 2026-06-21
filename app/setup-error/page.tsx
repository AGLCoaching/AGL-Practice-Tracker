export default function SetupErrorPage() {
  return (
    <div style={{ fontFamily: 'Arial', padding: 40, maxWidth: 500, margin: '80px auto' }}>
      <h1 style={{ color: '#1F3864', marginBottom: 12 }}>Profile Not Found</h1>
      <p style={{ color: '#404040', marginBottom: 24 }}>
        You are logged in but your coach profile could not be loaded. This is a setup issue.
      </p>
      <p style={{ color: '#6B7280', fontSize: 14 }}>
        Please contact Dan at dan.allinger@aglcoaching.com or check Supabase to confirm
        the public.users row exists with the correct ID.
      </p>
      <a href="/api/auth/signout" style={{ display: 'inline-block', marginTop: 24, color: '#2E75B6' }}>
        Sign out and try again
      </a>
    </div>
  )
}
