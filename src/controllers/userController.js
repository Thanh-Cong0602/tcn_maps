import { StatusCodes } from 'http-status-codes'
import { authenticator } from 'otplib'
import qrcode from 'qrcode'
import { pickUser } from '~/utils/formatters'

/*  NOTE: In this Two-Factor Authentication (2FA) example, we will
  use nedb-promises to save and access data from a JSON file.
  Consider this JSON file to be the Project's Database. */

const Datastore = require('nedb-promises')
const UserDB = Datastore.create('src/database/users.json')
const TwoFactorSecretKeyDB = Datastore.create('src/database/2fa_secret_keys.json')
const UserSessionDB = Datastore.create('src/database/user_sessions.json')

const SERVICE_NAME = '2FA - ThanhCongNguyen'

const login = async (req, res) => {
  try {
    const user = await UserDB.findOne({ email: req.body.email })
    // User does not exist
    if (!user) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found!' })
      return
    }
    // Check for "simple" passwords. NOTE: Actually, bcryptjs must be used to hash the password, ensuring the password is secure. Here we do it quickly in a string comparison style to focus on the main content of 2FA.
    // If you want to learn about bcryptjs as well as comprehensive knowledge about making an Advanced website, you can follow this MERN Stack Advanced course. (Public on the members section of the channel in December 2024)
    // https://www.youtube.com/playlist?list=PLP6tw4Zpj-RJbPQfTZ0eCAXH_mHQiuf2G
    if (user.password !== req.body.password) {
      res.status(StatusCodes.NOT_ACCEPTABLE).json({ message: 'Wrong password!' })
      return
    }

    res.status(StatusCodes.OK).json(pickUser(user))
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error)
  }
}

const getUser = async (req, res) => {
  try {
    const user = await UserDB.findOne({ _id: req.params.id })
    if (!user) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found!' })
      return
    }

    res.status(StatusCodes.OK).json(pickUser(user))
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error)
  }
}

const logout = async (req, res) => {
  try {
    const user = await UserDB.findOne({ _id: req.params.id })
    if (!user) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found!' })
      return
    }

    // Delete user sessions in Database > user_sessions here when logging out

    res.status(StatusCodes.OK).json({ loggedOut: true })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error)
  }
}

const get2FA_QRCode = async (req, res) => {
  try {
    const user = await UserDB.findOne({ _id: req.params.id })
    if (!user) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found!' })
      return
    }

    // Variable that stores the user's 2FA secret key
    let twoFactorSecretKeyValue = null
    // Get the user's 2fa secret key from the 2fa_secret_keys table
    const twoFactorSecretKey = await TwoFactorSecretKeyDB.findOne({ user_id: user._id })

    if (!twoFactorSecretKey) {
      // Create a new 2fa secret key and store it in the 2fa_secret_keys table
      const newTwoFactorSecretKey = await TwoFactorSecretKeyDB.insert({
        user_id: user._id,
        value: authenticator.generateSecret() // generateSecret() is a function from otplib to generate a new random secret key
      })

      twoFactorSecretKeyValue = newTwoFactorSecretKey
    } else {
      twoFactorSecretKeyValue = twoFactorSecretKey.value
    }

    // Generate OTP Auth Token
    const otpAuthToken = authenticator.keyuri(user.username, SERVICE_NAME, twoFactorSecretKeyValue)

    // Create a QR Code Image from OTP Token to send for client
    const qrCodeImageUrl = await qrcode.toDataURL(otpAuthToken)

    res.status(StatusCodes.OK).json({ qrcode: qrCodeImageUrl })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error)
  }
}

const setup2FA = async (req, res) => {
  try {
    /*  Step 1: Check exits of user */
    const user = await UserDB.findOne({ _id: req.params.id })
    if (!user) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found!' })
      return
    }

    /* Step 2: Get the user's 2fa secret key from the 2fa_secret_keys table */
    const twoFactorSecretKey = await TwoFactorSecretKeyDB.findOne({ user_id: user._id })
    if (!twoFactorSecretKey) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Two Factor Secret key not found!' })
    }

    /* Step 3: If the user already has the secret key, check the OTP Token sent by the client */
    const clientOTPToken = req.body.otpToken
    const isValid = authenticator.verify({
      token: clientOTPToken,
      secret: twoFactorSecretKey.value
    })

    if (!isValid) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Invalid OTP Token!' })
    }

    /* Step 4: If the OTP Token is valid, it means 2FA authentication has been successful,
     next update the user's require_2fa information in the Database. */
    const updatedUser = await UserDB.update(
      { _id: user._id },
      { $set: { require_2fa: true } },
      { returnUpdatedDocs: true }
    )

    /* https://github.com/seald/nedb/blob/HEAD/API.md#nedbcompactdatafileasync */
    UserDB.compactDatafileAsync()

    /*
      Step 5: Now depending on the project spec, it will retain a valid user login session, or be required the user must log in again.
    This depends on need.
      * Here we will choose to keep the login session valid for the user like Google did. When does the user actively log out and log back in?
    or the user logs in on a new device to require require_2fa.
      * Because the user has just enabled 2fa, we will create a new valid login session for the user with the identifier on the current browser.
    */

    const newUserSession = await UserSessionDB.insert({
      user_id: user._id,
      /* Get UserAgent from req.header to identify the user's browser (device_id) */
      device_id: req.header['user-agent'],
      /* Confirm the login session is valid with 2FA */
      is_2fa_verified: true,
      last_login: new Date().valueOf()
    })

    /* Step 6: Returns the necessary data to the client */
    res.status(StatusCodes.OK).json({
      ...pickUser(updatedUser),
      is_2fa_verified: newUserSession.is_2fa_verified,
      last_login: newUserSession.last_login
    })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error)
  }
}

export const userController = {
  login,
  getUser,
  logout,
  get2FA_QRCode,
  setup2FA
}
