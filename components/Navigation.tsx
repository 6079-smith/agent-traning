'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import layoutStyles from '@/styles/layout.module.css'
import * as Icons from 'lucide-react'

export default function Navigation() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Icons.LayoutDashboard },
    { href: '/wizard', label: 'Training Wizard', icon: Icons.Wand2 },
    { href: '/prompts', label: 'Prompt Editor', icon: Icons.FileEdit },
    { href: '/test-cases', label: 'Customer Emails', icon: Icons.Mail },
    { href: '/playground', label: 'Playground', icon: Icons.Play },
    { href: '/results', label: 'Results', icon: Icons.BarChart3 },
    { href: '/evaluator', label: 'Evaluator Rules', icon: Icons.Settings },
    { href: '/walkthrough', label: 'Walkthrough', icon: Icons.HelpCircle },
  ]

  return (
    <nav className={layoutStyles.sidebar}>
      <div className={layoutStyles.sidebarHeader}>
        <div className={layoutStyles.sidebarBrand}>CS Agent Optimizer</div>
        <div className={layoutStyles.sidebarSubtitle}>Prompt Training Workbench</div>
      </div>
      <div className={layoutStyles.sidebarNav}>
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${layoutStyles.sidebarLink} ${
                isActive(item.href) ? layoutStyles.sidebarLinkActive : ''
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
