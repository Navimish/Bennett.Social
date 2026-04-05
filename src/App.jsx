
import { Route, Routes } from 'react-router-dom'
import './App.css'
import { Navbar } from './components/ui/Navbar'
import Home from './pages/Home'
import CreatePost from './pages/CreatePost'
import Communities from './pages/Communities'

import Profile from './pages/Profile'
import { AppLayout } from './components/ui/AppLayout'
import CreateCommunity from './pages/CreateCommunity'
import ChatRoom from './pages/ChatRoom'
import Network from './pages/Network'
import UserProfile from './pages/UserProfile'
import DirectMessage from './pages/DirectMessage'
import Inbox from './pages/Inbox'


function App() {


  return (
  <>
    <Routes>
      <Route element={<AppLayout></AppLayout>}>

      <Route path='/' element ={<Home></Home>}></Route>
      <Route path='/createPost' element ={<CreatePost></CreatePost>}></Route>
      <Route path='/communities' element ={<Communities></Communities>}></Route>
      
      <Route path='/profile' element ={<Profile></Profile>}></Route>
      <Route path='/create-community' element ={<CreateCommunity></CreateCommunity>}></Route>
      <Route path="/communities/:slug" element={<ChatRoom />} />
      <Route path="/network" element={<Network />} />
      <Route path="/user/:username" element={<UserProfile />} />
      <Route path="/messages/:username" element={<DirectMessage />} />
      <Route path="/inbox" element={<Inbox />} />
      </Route>
    </Routes>
   
  </>
  )
}

export default App
