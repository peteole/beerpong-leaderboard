import { useEffect, useState } from "react"
import { supabase } from "./client"
import { Outlet, Link } from "react-router-dom";

export default function Home() {
    const [leaderboards, setLeaderboards] = useState([])
    const [leaderboardName, setLeaderboardName] = useState("")
    useEffect(() => {
        supabase.from("leaderboards").select("*").then(leaderboards => {
            console.log(leaderboards)
            setLeaderboards(leaderboards?.data)
        })
    }, [])
    return (
        <div>
            <p>Leaderboards</p>
            {
                leaderboards.map(l => {
                    return <Link to={`/leaderboards/${l.id}`}>{l.name}</Link>
                }
                )
            }
            <h2>Create leaderboard</h2>
            <input onChange={e => setLeaderboardName(e.target.value)} />
            <button onClick={async() => {
                await supabase.from("leaderboards").insert({ name: leaderboardName })
            }
            }>Create</button>

        </div>)
}