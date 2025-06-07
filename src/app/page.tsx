// pages/index.js
import fs from 'fs'
import path from 'path'
import { getSortedPostsData } from '@/lib/posts'
import ResourceList from '@/components/ResourceList'
import ArticleList from '@/components/ArticleList'
import { Metadata } from 'next'

type Resource = {
  name: string;
  description: string;
  url: string;
}

type Article = {
  id: string;
  title: string;
  date: string;
  description: string;
}

export const metadata: Metadata = {
  title: 'TokenInout.org - 安全、便捷的加密货币出入金指南',
  description: 'TokenInout.org 致力于提供全面、安全的法币与 USDT 之间出入金的指南。无论您是初学者还是经验丰富的用户，我们都将帮助您了解和掌握安全、便捷的兑换流程，让您的加密资产流通无忧。',
}

export default function Home() {
  let resources: Resource[] = []
  let allPostsData: Article[] = []

  try {
    const resourcesPath = path.join(process.cwd(), 'data', 'json', 'resources.json')
    const fileContent = fs.readFileSync(resourcesPath, 'utf8')
    resources = JSON.parse(fileContent)
    allPostsData = getSortedPostsData().slice(0, 6)
  } catch (error) {
    console.error('Error loading data:', error)
  }

  return (
    <div className="container mx-auto py-12 space-y-16">
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
          TokenInout.org
        </h1>
        <h2 className="text-2xl tracking-tighter sm:text-3xl md:text-3xl lg:text-3xl">安全、便捷的加密货币出入金指南</h2>
        <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl">
          TokenInout.org 致力于提供全面、安全的法币与 USDT 之间出入金的指南。无论您是初学者还是经验丰富的用户，我们都将帮助您了解和掌握安全、便捷的兑换流程，让您的加密资产流通无忧。
        </p>
      </section>

      {resources.length > 0 ? (
        <ResourceList resources={resources} />
      ) : (
        <div className="text-center text-gray-500">
          <p>暂时无法加载资源，请稍后再试</p>
        </div>
      )}
      
      {allPostsData.length > 0 ? (
        <ArticleList articles={allPostsData} />
      ) : (
        <div className="text-center text-gray-500">
          <p>暂时无法加载文章，请稍后再试</p>
        </div>
      )}
    </div>
  )
}