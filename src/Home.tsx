import { useEffect, useState } from "react"
import { supabase } from "./client"
import { Outlet, Link } from "react-router-dom";

export default function Home() {
    const [leaderboards, setLeaderboards] = useState([])
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
        </div>)
}