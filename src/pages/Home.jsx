import React, { useEffect, useState } from 'react'
import PostCard from '@/components/PostCard'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

function Home() {
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchPosts() {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        if (data) setPosts(data)
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPosts()
  }, [])

  return (
    <main className="flex max-w-6xl mx-auto w-full pt-8 px-4 gap-8">
      
      <div className="w-full md:w-2/3 flex flex-col gap-6">
        {isLoading ? (
          <div className="flex justify-center p-10">
            <p className="text-zinc-500 font-medium">Loading Your Bennett.Social feed...</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              id={post.id}
              author={post.author}
              content={post.content}
              timestamp={new Date(post.created_at).toLocaleString()}
              imageUrl={post.image_url}
              initialLikesCount={post.likes_count || 0}
            />
          ))
        )}
      </div>

      <aside className="hidden md:flex md:w-1/3 flex-col sticky top-24 h-fit">
        <Card className="p-5 bg-white border border-zinc-200 shadow-sm rounded-xl">
          <h3 className="font-semibold text-sm text-zinc-900 mb-4">
            Suggested Communities
          </h3>
          
          <ul className="flex flex-col gap-4">
            <li className="flex justify-between items-center">
              <span className="text-sm text-zinc-800 font-medium cursor-pointer hover:underline">
                Web Dev Club
              </span>
              <Button variant="outline" size="sm" className="cursor-pointer h-8 text-xs font-semibold text-blue-600 border-blue-200 hover:bg-blue-50">
                Join
              </Button>
            </li>
            
            <li className="flex justify-between items-center">
              <span className="text-sm text-zinc-800 font-medium cursor-pointer hover:underline">
                First Year Doubts
              </span>
              <Button variant="outline" size="sm" className="cursor-pointer h-8 text-xs font-semibold text-blue-600 border-blue-200 hover:bg-blue-50">
                Join
              </Button>
            </li>
          </ul>
        </Card>
      </aside>
      
    </main>
  )
}

export default Home