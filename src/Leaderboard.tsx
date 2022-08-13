import { useEffect, useReducer, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "./client";
import { Button, Input, Loading, Table, Tooltip } from "@nextui-org/react";
import { TagPicker } from 'rsuite';
import "./leaderboard.css"
import { TiPlus } from "react-icons/ti"

function PlayerSelector({ players, onChange, label }: { players: Player[], onChange: (player: number) => void, label: string }) {
    return (
        <div>
            {label}
            <select onChange={e => onChange(parseInt(e.target.value))}>
                {players.map(player => (
                    <option key={player.id} value={player.id} >
                        {player.name}
                    </option>
                ))}
            </select>
        </div>
    )
}
type Player = { name: string, id: number }
type Match = { winners: number[], losers: number[], inserted_at: string, id: number }

export default function Leaderboard() {
    const authenticated = supabase.auth.user !== null
    const navigate = useNavigate()
    const [players, setPlayers] = useState<Player[]>([])
    const [playerName, setPlayerName] = useState("")
    const [m, setMatches] = useState<Match[]>([])
    const [name, setName] = useState("")
    const id = useParams().id || 0;
    const [isLoading, setIsLoading] = useState(true)
    const [version, increase] = useReducer((s) => {
        return s + 1
    }, 0)

    const [winners, setWinners] = useState<number[]>([])
    const [losers, setLosers] = useState<number[]>([])
    const [editors, setEditors] = useState<{ email: string, leaderboard: number }[]>([])
    const [newEditorEmail, setNewEditorEmail] = useState("")


    useEffect(() => {
        supabase.from<{ name: string, players: Player[], matches: Match[], id: number }>('leaderboards').select(`
            name,
            players(name,id),
            matches(winners,losers,id,inserted_at)
        `).eq('id', id).then(leaderboard => {
            console.log(leaderboard)
            if (!leaderboard?.data?.length) return
            setName(leaderboard.data[0].name)
            setPlayers(leaderboard.data[0].players)
            setMatches(leaderboard.data[0].matches)
            setIsLoading(false)
            //setPlayers(leaderboard?.data)
        })
        supabase.from<{ email: string, leaderboard: number }>("leaderboard_editors").select("email,leaderboard").eq("leaderboard", id).then(editors => {
            if (editors.data)
                setEditors(editors.data)
        })
    }, [version])

    if (isLoading)
        return <Loading size="md" />
    const scores = new Map<number, number>(players.map(p => [p.id, 1000]))
    const matches = m.map(m => ({ ...m, inserted_at: new Date(m.inserted_at) }))

    //sort last to first
    matches.sort((a, b) => (a.inserted_at).getTime() - (b.inserted_at).getTime())
    const matchScores: number[] = []
    //console.log(scores)
    for (const match of matches) {
        //console.log(match)
        const winnerScores = match.winners.map(w => scores.get(w) || 1000)
        const loserScores = match.losers.map(l => scores.get(l) || 1000)
        const averageWinnerScore = winnerScores.reduce((a, b) => a + b, 0) / winnerScores.length
        const averageLoserScore = loserScores.reduce((a, b) => a + b, 0) / loserScores.length
        const winProbability = 1 / (1 + Math.pow(10, (averageLoserScore - averageWinnerScore) / 400))
        const update = 30 * (1 - winProbability)
        matchScores.push(update)
        for (const i in match.winners) {
            scores.set(match.winners[i], winnerScores[i] + update)
        }
        for (const i in match.losers) {
            scores.set(match.losers[i], loserScores[i] - update)
        }
    }
    matchScores.reverse()
    players.sort((a, b) => (scores.get(b.id) || 1000) - (scores.get(a.id) || 1000))

    return (
        <div style={{ textAlign: "center" }} className="leaderboard">
            <h1>Leaderboard {name}</h1>
            <h2>Players:</h2>
            <Table
                aria-label="Players"
                css={{
                    height: "auto",
                    minWidth: "100%",
                }}>
                <Table.Header>
                    <Table.Column>Name</Table.Column>
                    <Table.Column>Score</Table.Column>
                    <Table.Column>Actions</Table.Column>
                </Table.Header>
                <Table.Body>
                    {players.map((p) => (
                        <Table.Row>
                            <Table.Cell>{p.name}</Table.Cell>
                            <Table.Cell>{Math.round(scores.get(p.id) || 1000)}</Table.Cell>
                            <Table.Cell>
                                <Tooltip
                                    content="Delete player"
                                    color="error"
                                    onClick={async () => {
                                        await supabase.from('players').delete().eq('id', p.id)
                                        increase()
                                    }}
                                >
                                    <IconButton>
                                        <DeleteIcon size={20} fill="#FF0080" />
                                    </IconButton>
                                </Tooltip>
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>
            <h2>Add player</h2>
            <p>
                <Input onChange={e => setPlayerName(e.target.value)} placeholder="New player name"
                    contentClickable
                    clearable
                    contentRight={<TiPlus />}
                    onContentClick={async (p, e) => {
                        await supabase.from("players").insert({ name: playerName, leaderboard: id })
                        increase()
                    }}
                />

            </p>
            <h2>Add match result</h2>
            <p>Winners: <TagPicker
                style={{ zIndex: 2000 }}
                onChange={(v: string[]) => setWinners((v || []).map(v => parseInt(v)))}
                data={players.map(p => ({ label: p.name, value: p.id }))}
            />
            </p>
            <p>Losers: <TagPicker
                style={{ zIndex: 1000 }}
                onChange={(v: string[]) => setLosers((v || []).map(v => parseInt(v)))}
                data={players.map(p => ({ label: p.name, value: p.id }))}
            />
            </p>
            <Button
                disabled={winners.length === 0 || losers.length === 0}
                style={{ margin: "auto" }} onClick={async () => {
                    await supabase.from("matches").insert({
                        winners: winners,
                        losers: losers,
                        leaderboard: id
                    }
                    )
                    increase()
                }}>Add match</Button>
            <h2 style={{ marginTop: 50 }}>Matches</h2>
            <Table
                aria-label="Example table with static content"
                css={{
                    height: "auto",
                    minWidth: "100%",
                }}>
                <Table.Header>
                    <Table.Column>Winners</Table.Column>
                    <Table.Column>Losers</Table.Column>
                    <Table.Column>Date</Table.Column>
                    <Table.Column>Score</Table.Column>
                    <Table.Column>Actions</Table.Column>
                </Table.Header>
                <Table.Body>
                    {Array.from(matches).reverse().map((match, i) => (
                        <Table.Row>
                            <Table.Cell>{match.winners.map(w => players.find(p => p.id == w)?.name).join(", ")}</Table.Cell>
                            <Table.Cell>{match.losers.map(w => players.find(p => p.id == w)?.name).join(", ")}</Table.Cell>
                            <Table.Cell>{match.inserted_at.toLocaleDateString()}</Table.Cell>
                            <Table.Cell>±{Math.round(matchScores[i])}</Table.Cell>
                            <Table.Cell>
                                <Tooltip
                                    content="Delete match"
                                    color="error"
                                    onClick={async () => {
                                        await supabase.from('matches').delete().eq('id', match.id)
                                        increase()
                                    }}
                                >
                                    <IconButton>
                                        <DeleteIcon size={20} fill="#FF0080" />
                                    </IconButton>
                                </Tooltip>
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>
            <h2>Manage editors</h2>
            <p>
                <Input onChange={e => setNewEditorEmail(e.target.value)} placeholder="Editor email"
                    contentClickable
                    clearable
                    contentRight={<TiPlus />}
                    onContentClick={async (p, e) => {
                        await supabase.from("leaderboard_editors").insert({ email: newEditorEmail, leaderboard: id })
                        increase()
                    }}
                />

            </p>
            <Table
                aria-label="Editors"
                css={{
                    height: "auto",
                    minWidth: "100%",
                }}>
                <Table.Header>
                    <Table.Column>Email</Table.Column>
                    <Table.Column>Delete</Table.Column>
                </Table.Header>
                <Table.Body>
                    {
                        editors.map(e => (
                            <Table.Row>
                                <Table.Cell>{e.email}</Table.Cell>
                                <Table.Cell>
                                    <Tooltip
                                        content="Delete editor"
                                        color="error"
                                        onClick={async () => {
                                            await supabase.from('leaderboard_editors').delete().eq('email', e.email)
                                            increase()
                                        }}
                                    >
                                        <IconButton>
                                            <DeleteIcon size={20} fill="#FF0080" />
                                        </IconButton>
                                    </Tooltip>
                                </Table.Cell>
                            </Table.Row>)
                        )
                    }
                </Table.Body>
            </Table>
            <Button
                color="warning"
                style={{ margin: "auto" }}
                onClick={async () => {
                    await supabase.from("leaderboards").delete().eq("id", id)
                    navigate("/")
                }}>Delete leaderboard</Button>
        </div>
    )
}

import { styled } from '@nextui-org/react';

// IconButton component will be available as part of the core library soon
export const IconButton = styled('button', {
    dflex: 'center',
    border: 'none',
    outline: 'none',
    cursor: 'pointer',
    padding: '0',
    margin: '0',
    bg: 'transparent',
    transition: '$default',
    '&:hover': {
        opacity: '0.8'
    },
    '&:active': {
        opacity: '0.6'
    }
});
type IconProps = {
    fill?: string;
    size?: string | number;
    height?: string | number;
    width?: string | number;
    label?: string;
}

export const DeleteIcon: React.FC<IconProps> = ({
    fill,
    size,
    height,
    width,
    ...props
}) => {
    return (
        <svg
            width={size || width || 24}
            height={size || height || 24}
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <path
                d="M17.5 4.98332C14.725 4.70832 11.9333 4.56665 9.15 4.56665C7.5 4.56665 5.85 4.64998 4.2 4.81665L2.5 4.98332"
                stroke={fill}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M7.08331 4.14169L7.26665 3.05002C7.39998 2.25835 7.49998 1.66669 8.90831 1.66669H11.0916C12.5 1.66669 12.6083 2.29169 12.7333 3.05835L12.9166 4.14169"
                stroke={fill}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M15.7084 7.61664L15.1667 16.0083C15.075 17.3166 15 18.3333 12.675 18.3333H7.32502C5.00002 18.3333 4.92502 17.3166 4.83335 16.0083L4.29169 7.61664"
                stroke={fill}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M8.60834 13.75H11.3833"
                stroke={fill}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M7.91669 10.4167H12.0834"
                stroke={fill}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};
