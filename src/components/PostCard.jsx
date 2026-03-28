import React from 'react'
import { Card } from './ui/card'
import { Textarea } from './ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Separator } from './ui/separator'
import { Button } from './ui/button'

function PostCard({ 
  author = "Navi", 
  content = "Testing the Bennett-Social feed!", 
  timestamp = "Just now",
  imageUrl 
}) {
  return (
    <Card className="p-5 mb-6 bg-white border border-zinc-200 shadow-sm rounded-xl">
      <div className="flex items-center gap-3 mb-4">
        <Avatar className="cursor-pointer">
          <AvatarImage src="" />
          <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
            {author.charAt(0)}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col cursor-pointer">
          <h3 className="font-semibold text-sm text-zinc-900">{author}</h3>
          <p className="text-xs text-zinc-500">{timestamp}</p>
        </div>
      </div>

      {imageUrl && (
        <div className="mb-3 rounded-xl overflow-hidden border border-zinc-100 bg-zinc-50 cursor-pointer">
          <img 
            src={imageUrl} 
            alt="Post content" 
            className="w-full h-auto object-cover max-h-[500px]"
          />
        </div>
      )}

      <div className="mb-4 text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap">
        <p>{content}</p>
      </div>

      <Separator className="my-2 bg-zinc-100" />

      <div className="flex items-center gap-2 py-1">
        <Button variant="ghost" size="sm" className="cursor-pointer text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100">
          Like
        </Button>
        <Button variant="ghost" size="sm" className="cursor-pointer text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100">
          Comment
        </Button>
        <Button variant="ghost" size="sm" className="cursor-pointer text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100">
          Share
        </Button>
      </div>

      <Separator className="my-2 bg-zinc-100" />

      <div className="flex flex-col gap-3 mt-4">
        <Textarea 
          placeholder="Just Interact...." 
          className="min-h-[60px] max-h-[150px] text-sm resize-y focus-visible:ring-1 focus-visible:ring-blue-500"
        />
        <div className="flex justify-end">
          <Button size="sm" className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6">
            Post
          </Button>
        </div>
      </div>
    </Card>
  )
}

export default PostCard