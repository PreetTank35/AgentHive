import './globals.css'

export const metadata = {
  title: 'AgentHive — AI Virtual Team for Small Business',
  description: 'AI-powered virtual team that orchestrates specialist agents to help small businesses manage finances, content, scheduling, support, and analytics.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
