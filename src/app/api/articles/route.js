import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import matter from 'gray-matter';
import fs from 'fs';
import path from 'path';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const owner = 'businesszh';
const repo = 'tokeninout';
const articlesJsonPath = 'data/json/articles.json';
const mdFolderPath = 'data/md';
const localArticlesJsonPath = path.join(process.cwd(), articlesJsonPath);

function getLocalArticles() {
  try {
    const content = fs.readFileSync(localArticlesJsonPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading local articles:', error);
    return [];
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sync = searchParams.get('sync');
  const articlePath = searchParams.get('path');

  try {
    if (articlePath) {
      // Fetch single article
      try {
        const { data } = await octokit.repos.getContent({
          owner,
          repo,
          path: decodeURIComponent(articlePath),
        });

        const content = Buffer.from(data.content, 'base64').toString('utf8');
        const { data: frontMatter, content: articleContent } = matter(content);

        return NextResponse.json({
          ...frontMatter,
          content: articleContent,
          path: data.path,
        });
      } catch (error) {
        console.error('Error fetching article from GitHub:', error);
        // 尝试从本地读取
        try {
          const localPath = path.join(process.cwd(), decodeURIComponent(articlePath));
          const content = fs.readFileSync(localPath, 'utf8');
          const { data: frontMatter, content: articleContent } = matter(content);
          return NextResponse.json({
            ...frontMatter,
            content: articleContent,
            path: articlePath,
          });
        } catch (localError) {
          console.error('Error reading local article:', localError);
          return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 });
        }
      }
    } else if (sync === 'true') {
      await syncArticles();
    }

    // 获取文章列表
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: articlesJsonPath,
      });

      const content = Buffer.from(data.content, 'base64').toString('utf8');
      const articles = JSON.parse(content);
      return NextResponse.json(articles);
    } catch (error) {
      console.error('Error fetching articles from GitHub:', error);
      // 从本地文件读取
      const localArticles = getLocalArticles();
      return NextResponse.json(localArticles);
    }
  } catch (error) {
    console.error('Error in GET handler:', error);
    // 最后的回退：返回本地文件
    const localArticles = getLocalArticles();
    return NextResponse.json(localArticles);
  }
}

export async function POST(request) {
  const { article } = await request.json();

  try {
    // Update the MD file
    await updateMdFile(article);

    // Sync articles
    await syncArticles();

    return NextResponse.json({ message: 'Article updated successfully' });
  } catch (error) {
    console.error('Error updating article:', error);
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
  }
}

async function syncArticles() {
  try {
    // Fetch all MD files
    const { data: files } = await octokit.repos.getContent({
      owner,
      repo,
      path: mdFolderPath,
    });

    const mdFiles = files.filter(file => file.name.endsWith('.md'));

    const articles = await Promise.all(mdFiles.map(async file => {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: file.path,
      });

      const content = Buffer.from(data.content, 'base64').toString('utf8');
      const { data: frontMatter, content: articleContent } = matter(content);

      // Fetch the last commit for this file
      const { data: commits } = await octokit.repos.listCommits({
        owner,
        repo,
        path: file.path,
        per_page: 1
      });

      const lastModified = commits[0]?.commit.committer.date || data.sha;

      return {
        title: frontMatter.title,
        description: frontMatter.description,
        date: frontMatter.date,
        lastModified: lastModified,
        path: file.path,
      };
    }));

    // Update articles.json
    const { data: currentFile } = await octokit.repos.getContent({
      owner,
      repo,
      path: articlesJsonPath,
    });

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: articlesJsonPath,
      message: 'Sync articles',
      content: Buffer.from(JSON.stringify(articles, null, 2)).toString('base64'),
      sha: currentFile.sha,
    });

  } catch (error) {
    console.error('Error syncing articles:', error);
    throw error;
  }
}

async function updateMdFile(article) {
  try {
    const { data: currentFile } = await octokit.repos.getContent({
      owner,
      repo,
      path: article.path,
    });

    const currentContent = Buffer.from(currentFile.content, 'base64').toString('utf8');
    const { data: frontMatter, content: articleContent } = matter(currentContent);

    const updatedFrontMatter = {
      ...frontMatter,
      title: article.title,
      description: article.description,
      lastModified: new Date().toISOString(),
    };

    const updatedContent = matter.stringify(article.content, updatedFrontMatter);

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: article.path,
      message: `Update article: ${article.title}`,
      content: Buffer.from(updatedContent).toString('base64'),
      sha: currentFile.sha,
    });

  } catch (error) {
    console.error('Error updating MD file:', error);
    throw error;
  }
}