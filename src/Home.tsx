import { useEffect, useState } from "react"
import { supabase } from "./client"
import { Outlet, Link } from "react-router-dom";

export default function Home() {
    const [leaderboards, setLeaderboards] = useState<{ id: number, name: string }[]>([])
    const [leaderboardName, setLeaderboardName] = useState("")
    useEffect(() => {
        supabase.from<{ id: number, name: string }>("leaderboards").select("*").then(leaderboards => {
            console.log(leaderboards)
            if (!leaderboards?.data?.length) return
            setLeaderboards(leaderboards.data)
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
            <button onClick={async () => {
                await supabase.from("leaderboards").insert({ name: leaderboardName })
            }
            }>Create</button>

        </div>)
}