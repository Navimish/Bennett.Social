
import { Route, Routes } from 'react-router-dom'
import './App.css'
import { Navbar } from './components/ui/Navbar'
import Home from './pages/Home'
import CreatePost from './pages/CreatePost'
import Communities from './pages/Communities'
import CommunityDetails from './pages/CommunityDetails'
import Profile from './pages/Profile'
import { AppLayout } from './components/ui/AppLayout'
import CreateCommunity from './pages/CreateCommunity'


function App() {


  return (
  <>
    <Routes>
      <Route element={<AppLayout></AppLayout>}>

      <Route path='/' element ={<Home></Home>}></Route>
      <Route path='/createPost' element ={<CreatePost></CreatePost>}></Route>
      <Route path='/communities' element ={<Communities></Communities>}></Route>
      <Route path='/community-details' element ={<CommunityDetails></CommunityDetails>}></Route>
      <Route path='/profile' element ={<Profile></Profile>}></Route>
      <Route path='/create-community' element ={<CreateCommunity></CreateCommunity>}></Route>
      </Route>
    </Routes>
   
  </>
  )
}

export default App
