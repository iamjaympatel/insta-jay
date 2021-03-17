import {useSelector} from 'react-redux'

 

export  function IsFollowing(userId){
 
const user =useSelector((state)=>state.user)
const {token,currentUser}=user

  const data=  currentUser.following.includes(userId)
  //const data=  currentUser.following.includes((c)=>c===userId)
  if(data){

    return  true;
  }
  else{
    return false
  }
}